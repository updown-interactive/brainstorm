import 'dart:io';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'state.freezed.dart';

enum ClipboardAction { cut, copy }

@freezed
abstract class FilesState with _$FilesState {
  const factory FilesState({
    @Default(false) bool isLoading,
    @Default([]) List<FileSystemEntity> nodes,
    @Default({}) Set<String> expandedPaths,
    @Default({}) Map<String, String> allNotes,
    @Default({}) Map<String, List<String>> backlinks,
    String? rootPath,
    String? selectedPath,
    String? error,
    String? clipboardPath,
    ClipboardAction? clipboardAction,
  }) = _FilesState;
}
