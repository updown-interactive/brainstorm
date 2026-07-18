import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:brainstorm/core/theme/theme.dart';
import 'package:brainstorm/features/files/cubit/cubit.dart';
import 'package:brainstorm/features/files/cubit/state.dart';
import 'package:brainstorm/features/files/widgets/file_tree.dart';
import 'package:brainstorm/features/files/widgets/file_tree_toolbar.dart';
import 'package:brainstorm/features/shell/controller.dart';
import 'package:brainstorm/features/shell/state.dart';
import 'package:brainstorm/features/editor/editor_view.dart';
import 'package:brainstorm/app/sl.dart';

class FilesView extends StatefulWidget {
  const FilesView({super.key});

  @override
  State<FilesView> createState() => _FilesViewState();
}

class _FilesViewState extends State<FilesView> {
  late final FilesCubit _filesCubit;

  @override
  void initState() {
    super.initState();
    _filesCubit = sl<FilesCubit>();
    _initializeCubit();
  }

  void _initializeCubit() {
    final project = context.read<ShellCubit>().state.selectedProject;
    if (project != null) {
      _filesCubit.initialize(project.path);
    }
  }

  @override
  void dispose() {
    _filesCubit.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final typography = context.typography;

    return BlocProvider.value(
      value: _filesCubit,
      child: BlocListener<ShellCubit, ShellState>(
        listenWhen: (prev, curr) => prev.selectedProject?.path != curr.selectedProject?.path,
        listener: (context, state) {
          if (state.selectedProject != null) {
            _filesCubit.initialize(state.selectedProject!.path);
          }
        },
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Left Panel (File Tree)
            Container(
              width: 250,
              decoration: BoxDecoration(
                color: colors.surface,
                border: Border(
                  right: BorderSide(color: colors.divider),
                ),
              ),
              child: Column(
                children: [
                  const FileTreeToolbar(),
                  Expanded(
                    child: const FileTree(),
                  ),
                ],
              ),
            ),
            
            // Right Panel (Editor Pane)
            Expanded(
              child: BlocBuilder<FilesCubit, FilesState>(
                builder: (context, filesState) {
                  final selectedPath = filesState.selectedPath;
                  
                  if (selectedPath != null && !filesState.expandedPaths.contains(selectedPath)) {
                    // Check if it's a file by verifying it's not in expandedPaths (a heuristic, or better to use the fact we only select files usually, or check stat)
                    // For now, if we have a selectedPath, assume it's a file for the editor view.
                    return EditorView(
                      key: ValueKey(selectedPath), // Ensure it rebuilds on file change
                      filePath: selectedPath,
                    );
                  }

                  return Container(
                    color: colors.background,
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.edit_document,
                            size: 48,
                            color: colors.divider,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Select a file to view or edit',
                            style: TextStyle(
                              color: colors.textMuted,
                              fontFamily: typography.fontFamily,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
