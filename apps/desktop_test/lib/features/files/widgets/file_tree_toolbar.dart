import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:path/path.dart' as p;
import 'package:brainstorm/core/theme/theme.dart';
import 'package:brainstorm/core/database/brain_database.dart';
import 'package:brainstorm/features/files/cubit/cubit.dart';
import 'package:brainstorm/features/shell/controller.dart';

class FileTreeToolbar extends StatelessWidget {
  const FileTreeToolbar({super.key});

  static void showCreateDialog(BuildContext context, bool isFolder, {String? targetParentPath}) {
    final colors = context.colors;
    final typography = context.typography;
    final cubit = context.read<FilesCubit>();
    
    // Determine the parent path to create inside
    final state = cubit.state;
    final selectedPath = state.selectedPath;
    String parentPath;
    
    if (targetParentPath != null) {
      parentPath = targetParentPath;
    } else if (selectedPath != null) {
      if (Directory(selectedPath).existsSync()) {
        parentPath = selectedPath;
      } else {
        parentPath = p.dirname(selectedPath);
      }
    } else {
      // fallback to project root
      final project = context.read<ShellCubit>().state.selectedProject;
      if (project == null) return;
      parentPath = project.path;
    }

    if (!isFolder) {
      _createUntitledFile(cubit, parentPath);
      return;
    }

    final project = context.read<ShellCubit>().state.selectedProject;
    final accentColor = project?.projectColor ?? colors.primary;

    final controller = TextEditingController();

    showDialog(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: colors.surface,
          title: Text(
            isFolder ? 'New Folder' : 'New File',
            style: TextStyle(
              color: colors.text,
              fontFamily: typography.fontFamily,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: TextField(
            controller: controller,
            autofocus: true,
            style: TextStyle(color: colors.text, fontFamily: typography.fontFamily),
            decoration: InputDecoration(
              hintText: isFolder ? 'folder_name' : 'filename.md',
              hintStyle: TextStyle(color: colors.textMuted),
              enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: colors.divider)),
              focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: accentColor)),
            ),
            onSubmitted: (val) {
              _submit(dialogContext, cubit, val, parentPath, isFolder);
            },
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: Text('Cancel', style: TextStyle(color: colors.textMuted)),
            ),
            TextButton(
              onPressed: () {
                _submit(dialogContext, cubit, controller.text, parentPath, isFolder);
              },
              child: Text('Create', style: TextStyle(color: accentColor)),
            ),
          ],
        );
      }
    );
  }

  static void _submit(BuildContext context, FilesCubit cubit, String name, String parentPath, bool isFolder) {
    if (name.trim().isEmpty) return;
    Navigator.pop(context);
    if (isFolder) {
      cubit.createFolder(name.trim(), parentPath);
    } else {
      String fileName = name.trim();
      if (!fileName.toLowerCase().endsWith('.md')) {
        final ext = p.extension(fileName);
        if (ext.isNotEmpty) {
          fileName = fileName.substring(0, fileName.length - ext.length);
        }
        fileName += '.md';
      }
      cubit.createFile(fileName, parentPath);
    }
  }

  static void _createUntitledFile(FilesCubit cubit, String parentPath) async {
    String baseName = 'Untitled';
    String fileName = '$baseName.md';
    int counter = 1;

    while (File(p.join(parentPath, fileName)).existsSync()) {
      fileName = '$baseName $counter.md';
      counter++;
    }

    await cubit.createFile(fileName, parentPath);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: colors.divider)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            'EXPLORER',
            style: TextStyle(
              color: colors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
          Row(
            children: [
              _ToolbarButton(
                icon: Icons.note_add_outlined,
                tooltip: 'New File',
                onTap: () => FileTreeToolbar.showCreateDialog(context, false),
              ),
              const SizedBox(width: 4),
              _ToolbarButton(
                icon: Icons.create_new_folder_outlined,
                tooltip: 'New Folder',
                onTap: () => FileTreeToolbar.showCreateDialog(context, true),
              ),
            ],
          )
        ],
      ),
    );
  }
}

class _ToolbarButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  const _ToolbarButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(4),
        child: Padding(
          padding: const EdgeInsets.all(4.0),
          child: Icon(
            icon,
            size: 16,
            color: colors.text,
          ),
        ),
      ),
    );
  }
}
