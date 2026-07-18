import 'dart:io';
import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:path/path.dart' as p;
import 'package:brainstorm/features/files/cubit/state.dart';

class FilesCubit extends Cubit<FilesState> {
  FilesCubit() : super(const FilesState());

  String? _rootPath;
  StreamSubscription<FileSystemEvent>? _watchSubscription;

  void initialize(String rootPath) {
    _rootPath = rootPath;
    _watchSubscription?.cancel();
    _watchSubscription = Directory(rootPath).watch(recursive: false).listen((event) {
      loadFiles();
    });
    
    emit(state.copyWith(rootPath: rootPath, expandedPaths: {rootPath}));
    loadFiles();
  }

  @override
  Future<void> close() {
    _watchSubscription?.cancel();
    return super.close();
  }

  Future<void> loadFiles() async {
    if (_rootPath == null) return;
    
    emit(state.copyWith(isLoading: true, error: null));
    
    try {
      final rootDir = Directory(_rootPath!);
      if (!await rootDir.exists()) {
        await rootDir.create(recursive: true);
      }
      
      final nodes = await _getNodes(_rootPath!);
      emit(state.copyWith(isLoading: false, nodes: nodes));
      
      // Build index asynchronously so it doesn't block UI load
      _buildIndex();
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<List<FileSystemEntity>> _getNodes(String path) async {
    final dir = Directory(path);
    if (!await dir.exists()) return [];

    final entities = await dir.list().toList();
    
    // Sort: Folders first, then files, both alphabetically
    entities.sort((a, b) {
      final aIsDirectory = a is Directory;
      final bIsDirectory = b is Directory;
      if (aIsDirectory && !bIsDirectory) return -1;
      if (!aIsDirectory && bIsDirectory) return 1;
      return a.path.toLowerCase().compareTo(b.path.toLowerCase());
    });

    // Filter out some hidden files (like .DS_Store)
    return entities.where((e) {
      final name = p.basename(e.path);
      return name != '.DS_Store' && name != '.git';
    }).toList();
  }

  Future<void> _buildIndex() async {
    if (_rootPath == null) return;
    final dir = Directory(_rootPath!);
    if (!await dir.exists()) return;

    final Map<String, String> allNotes = {};
    final Map<String, List<String>> backlinks = {};

    try {
      final entities = await dir.list(recursive: true).toList();
      for (final e in entities) {
        if (e is File && e.path.endsWith('.md')) {
          final name = p.basenameWithoutExtension(e.path);
          allNotes[name] = e.path;
        }
      }

      for (final e in entities) {
        if (e is File && e.path.endsWith('.md')) {
          final content = await e.readAsString();
          final matches = RegExp(r'\[\[(.+?)\]\]').allMatches(content);
          
          for (final m in matches) {
            final targetNote = m.group(1)!;
            // Map link target to its file path (if exists)
            final targetPath = allNotes[targetNote];
            if (targetPath != null) {
              final list = backlinks[targetPath] ?? [];
              if (!list.contains(e.path)) list.add(e.path);
              backlinks[targetPath] = list;
            }
          }
        }
      }

      emit(state.copyWith(allNotes: allNotes, backlinks: backlinks));
    } catch (e) {
      print('Error building index: $e');
    }
  }

  void toggleExpansion(String path) {
    final newExpanded = Set<String>.from(state.expandedPaths);
    if (newExpanded.contains(path)) {
      newExpanded.remove(path);
    } else {
      newExpanded.add(path);
    }
    emit(state.copyWith(expandedPaths: newExpanded));
  }

  void selectPath(String path) {
    emit(state.copyWith(selectedPath: path));
  }

  Future<void> createFile(String name, String parentPath) async {
    try {
      final file = File(p.join(parentPath, name));
      if (!await file.exists()) {
        await file.create();
      }
      if (!state.expandedPaths.contains(parentPath)) {
        toggleExpansion(parentPath);
      }
      await loadFiles();
      selectPath(file.path);
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> createAndOpenFile(String noteName, String currentFilePath) async {
    final parentPath = p.dirname(currentFilePath);
    final fileName = '$noteName.md';
    await createFile(fileName, parentPath);
  }

  Future<void> createFolder(String name, String parentPath) async {
    try {
      final dir = Directory(p.join(parentPath, name));
      if (!await dir.exists()) {
        await dir.create();
      }
      if (!state.expandedPaths.contains(parentPath)) {
        toggleExpansion(parentPath);
      }
      await loadFiles();
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  void setClipboard(String path, ClipboardAction action) {
    emit(state.copyWith(clipboardPath: path, clipboardAction: action));
  }

  Future<void> pasteFromClipboard(String destinationFolderPath) async {
    final srcPath = state.clipboardPath;
    final action = state.clipboardAction;
    if (srcPath == null || action == null) return;
    
    try {
      final name = p.basename(srcPath);
      final destPath = p.join(destinationFolderPath, name);
      
      // Prevent copying/moving a folder into itself
      if (destPath.startsWith(srcPath + p.separator) || destPath == srcPath) {
        emit(state.copyWith(error: 'Cannot paste a folder into itself.'));
        return;
      }
      
      final isDir = await FileSystemEntity.isDirectory(srcPath);
      if (isDir) {
        if (action == ClipboardAction.cut) {
          await Directory(srcPath).rename(destPath);
        } else {
          await _copyDirectory(Directory(srcPath), Directory(destPath));
        }
      } else {
        if (action == ClipboardAction.cut) {
          await File(srcPath).rename(destPath);
        } else {
          await File(srcPath).copy(destPath);
        }
      }

      if (action == ClipboardAction.cut) {
        emit(state.copyWith(clipboardPath: null, clipboardAction: null));
      }
      
      await loadFiles();
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _copyDirectory(Directory source, Directory destination) async {
    await destination.create(recursive: true);
    await for (var entity in source.list(recursive: false)) {
      if (entity is Directory) {
        var newDirectory = Directory(p.join(destination.absolute.path, p.basename(entity.path)));
        await newDirectory.create();
        await _copyDirectory(entity.absolute, newDirectory);
      } else if (entity is File) {
        await entity.copy(p.join(destination.path, p.basename(entity.path)));
      }
    }
  }

  Future<void> deleteEntity(String path) async {
    try {
      final isDir = await FileSystemEntity.isDirectory(path);
      if (isDir) {
        await Directory(path).delete(recursive: true);
      } else {
        await File(path).delete();
      }
      if (state.selectedPath == path) {
        emit(state.copyWith(selectedPath: null));
      }
      if (state.clipboardPath == path) {
        emit(state.copyWith(clipboardPath: null, clipboardAction: null));
      }
      await loadFiles();
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> renameEntity(String oldPath, String newName) async {
    try {
      final parent = p.dirname(oldPath);
      final newPath = p.join(parent, newName);
      
      final isDir = await FileSystemEntity.isDirectory(oldPath);
      if (isDir) {
        await Directory(oldPath).rename(newPath);
      } else {
        await File(oldPath).rename(newPath);
      }
      
      if (state.selectedPath == oldPath) {
        emit(state.copyWith(selectedPath: newPath));
      }
      await loadFiles();
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> renameFileFromHeader(String oldPath, String headerText) async {
    String newName = headerText.trim().replaceAll(RegExp(r'[<>:"/\\|?*]'), '');
    if (newName.isEmpty) newName = 'Untitled';
    newName += '.md';
    
    final oldName = p.basename(oldPath);
    if (oldName == newName) return;

    await renameEntity(oldPath, newName);
  }

  Future<void> moveEntity(String sourcePath, String destinationFolderPath) async {
    try {
      final name = p.basename(sourcePath);
      final destPath = p.join(destinationFolderPath, name);
      
      // Don't move a folder into itself
      if (destPath.startsWith(sourcePath + p.separator) || destPath == sourcePath) {
        return;
      }
      
      final isDir = await FileSystemEntity.isDirectory(sourcePath);
      if (isDir) {
        await Directory(sourcePath).rename(destPath);
      } else {
        await File(sourcePath).rename(destPath);
      }
      
      if (state.selectedPath == sourcePath) {
        emit(state.copyWith(selectedPath: destPath));
      }
      await loadFiles();
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }
}
