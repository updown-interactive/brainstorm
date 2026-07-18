import 'dart:io';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:path/path.dart' as p;
import 'package:brainstorm/core/theme/theme.dart';
import 'package:brainstorm/core/database/brain_database.dart';
import 'package:brainstorm/features/files/cubit/cubit.dart';
import 'package:brainstorm/features/files/cubit/state.dart';
import 'package:brainstorm/features/files/widgets/file_tree_toolbar.dart';
import 'package:brainstorm/features/shell/controller.dart';

class FileTree extends StatelessWidget {
  const FileTree({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<FilesCubit, FilesState>(
      builder: (context, state) {
        if (state.isLoading && state.nodes.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        if (state.error != null) {
          return Center(
            child: Text(
              'Error loading files:\n${state.error}',
              style: TextStyle(color: context.colors.error),
              textAlign: TextAlign.center,
            ),
          );
        }

        if (state.rootPath == null) {
          return const Center(child: CircularProgressIndicator());
        }

        return ListView(
          padding: const EdgeInsets.symmetric(vertical: 8),
          children: [
            _FileTreeNode(
              entity: Directory(state.rootPath!),
              level: 0,
            ),
          ],
        );
      },
    );
  }
}

class _FileTreeNode extends StatelessWidget {
  final FileSystemEntity entity;
  final int level;

  const _FileTreeNode({
    required this.entity,
    required this.level,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final typography = context.typography;
    final isDirectory = entity is Directory;
    var name = p.basename(entity.path);
    if (!isDirectory && name.toLowerCase().endsWith('.md')) {
      name = name.substring(0, name.length - 3);
    }
    final project = context.read<ShellCubit>().state.selectedProject;
    final accentColor = project?.projectColor ?? colors.primary;

    return BlocBuilder<FilesCubit, FilesState>(
      buildWhen: (prev, curr) {
        return prev.expandedPaths.contains(entity.path) != curr.expandedPaths.contains(entity.path) ||
               prev.selectedPath == entity.path || curr.selectedPath == entity.path;
      },
      builder: (context, state) {
        final isExpanded = state.expandedPaths.contains(entity.path);
        final isSelected = state.selectedPath == entity.path;
        final hasClipboardItems = state.clipboardPath != null;

        Widget nodeContent = InkWell(
          onTap: () {
            context.read<FilesCubit>().selectPath(entity.path);
            if (isDirectory) {
              context.read<FilesCubit>().toggleExpansion(entity.path);
            }
          },
          child: Container(
            height: 28,
            padding: const EdgeInsets.only(right: 16.0),
            decoration: BoxDecoration(
              color: (isSelected && !isDirectory) ? accentColor.withValues(alpha: 0.1) : Colors.transparent,
              border: isSelected ? Border.all(color: accentColor, width: 1) : Border.all(color: Colors.transparent, width: 1),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(width: 12),
                for (int i = 0; i < level; i++)
                  Container(
                    width: 16,
                    decoration: BoxDecoration(
                      border: Border(
                        left: BorderSide(
                          color: colors.border,
                          width: 1,
                        ),
                      ),
                    ),
                  ),
                const SizedBox(width: 4),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Icon(
                    isDirectory
                        ? Icons.folder
                        : Icons.insert_drive_file_outlined,
                    size: 16,
                    color: isDirectory ? accentColor : colors.textMuted,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      name,
                      style: TextStyle(
                        fontSize: 13,
                        color: isSelected ? accentColor : colors.text,
                        fontFamily: typography.fontFamily,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );

        // Right-Click Context Menu
        nodeContent = GestureDetector(
          onSecondaryTapDown: (details) {
            _showContextMenu(context, details.globalPosition, isDirectory, hasClipboardItems, state);
          },
          child: nodeContent,
        );

        // Drag and Drop
        final currentContentForDraggable = nodeContent;
        final isRoot = state.rootPath == entity.path;
        
        if (!isRoot) {
          nodeContent = Draggable<String>(
            data: entity.path,
            feedback: Material(
              color: Colors.transparent,
              child: Opacity(
                opacity: 0.7,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: colors.surface,
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: accentColor),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(isDirectory ? Icons.folder : Icons.insert_drive_file_outlined, size: 16, color: accentColor),
                      const SizedBox(width: 8),
                      Text(name, style: TextStyle(color: colors.text, fontSize: 13)),
                    ],
                  ),
                ),
              ),
            ),
            child: currentContentForDraggable,
          );
        }

        if (isDirectory) {
          final contentForDragTarget = nodeContent;
          nodeContent = DragTarget<String>(
            onWillAcceptWithDetails: (details) {
              final draggedPath = details.data;
              return draggedPath != entity.path && !entity.path.startsWith(draggedPath + p.separator);
            },
            onAcceptWithDetails: (details) {
              context.read<FilesCubit>().moveEntity(details.data, entity.path);
            },
            builder: (context, candidateData, rejectedData) {
              return Container(
                color: candidateData.isNotEmpty ? accentColor.withValues(alpha: 0.2) : Colors.transparent,
                child: contentForDragTarget,
              );
            },
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            nodeContent,
            if (isDirectory && isExpanded)
              _DirectoryChildren(
                directoryPath: entity.path,
                level: level + 1,
              ),
          ],
        );
      },
    );
  }

  PopupMenuItem<String> _buildMenuItem(String value, String text, {String? shortcut, Color? textColor, bool enabled = true}) {
    return PopupMenuItem<String>(
      value: value,
      enabled: enabled,
      height: 32,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(text, style: TextStyle(color: enabled ? (textColor ?? const Color(0xFFD4D4D4)) : const Color(0xFF5A5A5A), fontSize: 13)),
          if (shortcut != null)
            Text(shortcut, style: TextStyle(color: enabled ? const Color(0xFF858585) : const Color(0xFF5A5A5A), fontSize: 12)),
        ],
      ),
    );
  }

  void _showContextMenu(BuildContext context, Offset position, bool isDirectory, bool hasClipboardItems, FilesState state) {
    final colors = context.colors;
    final cubit = context.read<FilesCubit>();
    final isRoot = state.rootPath == entity.path;
    
    showMenu(
      context: context,
      position: RelativeRect.fromLTRB(position.dx, position.dy, position.dx, position.dy),
      color: const Color(0xFF252526),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(6),
        side: const BorderSide(color: Color(0xFF454545), width: 1),
      ),
      elevation: 8,
      items: <PopupMenuEntry<String>>[
        if (isDirectory) ...[
          _buildMenuItem('new_file', 'New File'),
          _buildMenuItem('new_folder', 'New Folder'),
          const PopupMenuDivider(height: 9),
        ],
        if (!isRoot)
          _buildMenuItem('cut', 'Cut'),
        _buildMenuItem('copy', 'Copy'),
        if (isDirectory)
          _buildMenuItem('paste', 'Paste', enabled: hasClipboardItems),
        if (!isRoot) ...[
          const PopupMenuDivider(height: 9),
          _buildMenuItem('rename', 'Rename'),
          _buildMenuItem('delete', 'Delete', textColor: colors.error),
        ],
      ],
    ).then((value) {
      if (value == null) return;
      
      switch (value) {
        case 'new_file':
          FileTreeToolbar.showCreateDialog(context, false, targetParentPath: entity.path);
          break;
        case 'new_folder':
          FileTreeToolbar.showCreateDialog(context, true, targetParentPath: entity.path);
          break;
        case 'cut':
          cubit.setClipboard(entity.path, ClipboardAction.cut);
          break;
        case 'copy':
          cubit.setClipboard(entity.path, ClipboardAction.copy);
          break;
        case 'paste':
          cubit.pasteFromClipboard(entity.path);
          break;
        case 'delete':
          cubit.deleteEntity(entity.path);
          break;
        case 'rename':
          _showRenameDialog(context, cubit);
          break;
      }
    });
  }

  void _showRenameDialog(BuildContext context, FilesCubit cubit) {
    final colors = context.colors;
    final controller = TextEditingController(text: p.basename(entity.path));
    
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: colors.surface,
        title: Text('Rename', style: TextStyle(color: colors.text)),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: TextStyle(color: colors.text),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(color: colors.textMuted)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              if (controller.text.trim().isNotEmpty) {
                cubit.renameEntity(entity.path, controller.text.trim());
              }
            },
            child: Text('Rename', style: TextStyle(color: colors.primary)),
          ),
        ],
      )
    );
  }
}

class _DirectoryChildren extends StatefulWidget {
  final String directoryPath;
  final int level;

  const _DirectoryChildren({
    required this.directoryPath,
    required this.level,
  });

  @override
  State<_DirectoryChildren> createState() => _DirectoryChildrenState();
}

class _DirectoryChildrenState extends State<_DirectoryChildren> {
  List<FileSystemEntity>? _children;
  StreamSubscription<FileSystemEvent>? _watchSubscription;

  @override
  void initState() {
    super.initState();
    _loadChildren();
    
    final dir = Directory(widget.directoryPath);
    if (dir.existsSync()) {
      _watchSubscription = dir.watch(recursive: false).listen((event) {
        if (mounted) {
          _loadChildren();
        }
      });
    }
  }

  @override
  void dispose() {
    _watchSubscription?.cancel();
    super.dispose();
  }

  Future<void> _loadChildren() async {
    final dir = Directory(widget.directoryPath);
    if (!await dir.exists()) return;

    final entities = await dir.list().toList();
    entities.sort((a, b) {
      final aIsDirectory = a is Directory;
      final bIsDirectory = b is Directory;
      if (aIsDirectory && !bIsDirectory) return -1;
      if (!aIsDirectory && bIsDirectory) return 1;
      return a.path.toLowerCase().compareTo(b.path.toLowerCase());
    });

    final filtered = entities.where((e) {
      final name = p.basename(e.path);
      return name != '.DS_Store' && name != '.git';
    }).toList();

    if (mounted) {
      setState(() {
        _children = filtered;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_children == null) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: _children!.map((entity) => _FileTreeNode(
        entity: entity,
        level: widget.level,
      )).toList(),
    );
  }
}
