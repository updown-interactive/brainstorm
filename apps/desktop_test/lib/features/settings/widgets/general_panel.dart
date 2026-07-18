import 'package:brainstorm/app/router.dart';
import 'package:brainstorm/core/database/brain_database.dart';
import 'package:brainstorm/core/theme/theme.dart';
import 'package:brainstorm/core/ui/toast/toast_cubit.dart';
import 'package:brainstorm/features/shell/controller.dart';
import 'package:brainstorm/shared/widgets/color_picker_panel.dart';
import 'package:brainstorm/shared/utils/project_icons.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:drift/drift.dart' as drift;

import 'panel_container.dart';

class GeneralPanel extends StatefulWidget {
  final Project? project;
  
  const GeneralPanel({super.key, this.project});

  @override
  State<GeneralPanel> createState() => _GeneralPanelState();
}

class _GeneralPanelState extends State<GeneralPanel> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _descriptionController;
  
  String _selectedIcon = 'workspaces';
  String _selectedColor = '#10B981';

  String _colorToHex(int? argb) {
    if (argb == null) return '#10B981';
    final hex = (argb & 0xFFFFFF).toRadixString(16).padLeft(6, '0').toUpperCase();
    return '#$hex';
  }

  Color _hexToColor(String hex) {
    final hexCode = hex.replaceAll('#', '');
    return Color(int.parse('FF$hexCode', radix: 16));
  }

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _descriptionController = TextEditingController();
    _populateControllers(widget.project);
  }

  @override
  void didUpdateWidget(covariant GeneralPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.project?.id != oldWidget.project?.id || 
        widget.project?.updatedAt != oldWidget.project?.updatedAt) {
      _populateControllers(widget.project);
    }
  }

  void _populateControllers(Project? project) {
    if (project == null) return;
    if (_nameController.text != project.name) {
      _nameController.text = project.name;
    }
    final desc = project.description ?? '';
    if (_descriptionController.text != desc) {
      _descriptionController.text = desc;
    }
    
    final newIcon = project.icon ?? 'workspaces';
    if (_selectedIcon != newIcon) {
      _selectedIcon = newIcon;
    }
    
    final newColor = _colorToHex(project.color);
    if (_selectedColor != newColor) {
      _selectedColor = newColor;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  void _saveChanges() {
    if (_formKey.currentState?.validate() ?? false) {
      final shellCubit = context.read<ShellCubit>();
      final currentProject = shellCubit.state.selectedProject;
      if (currentProject != null) {
        final updatedProject = currentProject.copyWith(
          name: _nameController.text,
          description: drift.Value(_descriptionController.text.isEmpty ? null : _descriptionController.text),
          icon: drift.Value(_selectedIcon),
          color: drift.Value(_hexToColor(_selectedColor).toARGB32()),
        );
        shellCubit.updateProject(updatedProject);
        context.read<ToastCubit>().showToast(
          title: 'Project Settings Saved',
          message: 'Your general settings have been updated.',
          icon: Icons.check_circle_outline_rounded,
          color: updatedProject.projectColor ?? context.colors.primary,
        );
      }
    }
  }

  void _showDeleteConfirmation(BuildContext context) {
    final colors = context.colors;
    final typography = context.typography;
    final projectName = widget.project?.name ?? '';
    String confirmText = '';
    
    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            final isMatch = confirmText == projectName;
            return AlertDialog(
              backgroundColor: colors.surface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              title: Text(
                'Delete Project',
                style: TextStyle(
                  color: Colors.red.shade700,
                  fontFamily: typography.fontFamily,
                  fontWeight: FontWeight.bold,
                ),
              ),
              content: SizedBox(
                width: 400,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'This action cannot be undone. This will permanently delete the project and remove all associated data.',
                      style: TextStyle(color: colors.text, fontFamily: typography.fontFamily),
                    ),
                    const SizedBox(height: 16),
                    SelectableText.rich(
                      TextSpan(
                        text: 'Please type "',
                        children: [
                          TextSpan(
                            text: projectName,
                            style: TextStyle(fontWeight: FontWeight.w600, color: colors.text),
                          ),
                          const TextSpan(text: '" to confirm.'),
                        ],
                      ),
                      style: TextStyle(color: colors.textMuted, fontFamily: typography.fontFamily, fontSize: 13),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      onChanged: (val) => setState(() => confirmText = val),
                      style: TextStyle(color: colors.text, fontFamily: typography.fontFamily),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: colors.background,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(6),
                          borderSide: BorderSide(color: colors.divider),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(6),
                          borderSide: BorderSide(color: colors.divider),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(6),
                          borderSide: BorderSide(color: Colors.red.shade400),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text('Cancel', style: TextStyle(color: colors.textMuted)),
                ),
                ElevatedButton(
                  onPressed: isMatch ? () {
                    Navigator.of(context).pop();
                    _deleteProject();
                  } : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red.shade600,
                    disabledBackgroundColor: colors.divider,
                  ),
                  child: Text('Delete Project', style: TextStyle(color: isMatch ? Colors.white : colors.textMuted)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _deleteProject() async {
    final project = widget.project;
    if (project != null) {
      final shellCubit = context.read<ShellCubit>();
      await shellCubit.deleteProject(project);
      
      if (!mounted) return;
      context.read<ToastCubit>().showToast(
        title: 'Project Deleted',
        message: 'The project was successfully deleted.',
        icon: Icons.delete_outline_rounded,
        color: Colors.red,
      );
      
      final nextProject = shellCubit.state.selectedProject;
      if (nextProject == null) {
        context.pushReplacementTo(Routes.projectOnboarding);
      }
    }
  }

  Widget _buildRow({
    required String title,
    required String description,
    required Widget child,
  }) {
    final colors = context.colors;
    final typography = context.typography;
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: colors.text,
                    fontFamily: typography.fontFamily,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 13,
                    color: colors.textMuted,
                    fontFamily: typography.fontFamily,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 32),
          Expanded(
            flex: 3,
            child: child,
          ),
        ],
      ),
    );
  }

  Widget _buildInput({
    required TextEditingController controller,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    final colors = context.colors;
    final typography = context.typography;
    final projectColor = widget.project?.projectColor ?? colors.primary;
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      validator: validator,
      style: TextStyle(
        color: colors.text,
        fontFamily: typography.fontFamily,
        fontSize: 14,
      ),
      decoration: InputDecoration(
        filled: true,
        fillColor: colors.surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: BorderSide(color: colors.divider),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: BorderSide(color: colors.divider),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: BorderSide(color: projectColor),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      ),
    );
  }

  Widget _buildReadOnlyField(String value) {
    final colors = context.colors;
    final typography = context.typography;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: colors.divider),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: colors.textMuted,
                fontFamily: typography.fontFamily,
                fontSize: 14,
              ),
            ),
          ),
          MouseRegion(
            cursor: SystemMouseCursors.click,
            child: GestureDetector(
              onTap: () {
                // In a real app, copy to clipboard
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: colors.divider),
                ),
                child: Row(
                  children: [
                    Icon(Icons.copy, size: 12, color: colors.textMuted),
                    const SizedBox(width: 4),
                    Text(
                      'Copy',
                      style: TextStyle(
                        fontSize: 12,
                        color: colors.textMuted,
                        fontFamily: typography.fontFamily,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final typography = context.typography;
    final projectId = widget.project?.id ?? '';
    final projectColor = widget.project?.projectColor ?? colors.primary;

    return PanelContainer(
      title: 'General Settings',
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: colors.divider),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  _buildRow(
                    title: 'Project Name',
                    description: 'Used to identify your project on the dashboard.',
                    child: _buildInput(
                      controller: _nameController,
                      validator: (val) => (val == null || val.trim().isEmpty) ? 'Project name is required' : null,
                    ),
                  ),
                  Divider(height: 1, color: colors.divider),
                  _buildRow(
                    title: 'Description',
                    description: 'A brief explanation of what this project is for.',
                    child: _buildInput(
                      controller: _descriptionController,
                      maxLines: 2,
                    ),
                  ),
                  Divider(height: 1, color: colors.divider),
                  _buildRow(
                    title: 'Project ID',
                    description: 'Reference used in internal systems and APIs.',
                    child: _buildReadOnlyField(projectId),
                  ),
                  Divider(height: 1, color: colors.divider),
                  _buildRow(
                    title: 'Workspace Directory',
                    description: 'The local path where your project files are stored.',
                    child: _buildReadOnlyField(widget.project?.path ?? ''),
                  ),
                  Divider(height: 1, color: colors.divider),
                  _buildRow(
                    title: 'Personalization',
                    description: 'Choose a unique icon and color to identify your project.',
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Compact Icon Selection
                        Container(
                          width: 56,
                          height: 48,
                          decoration: BoxDecoration(
                            color: colors.background,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: colors.divider),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _selectedIcon,
                              isExpanded: true,
                              dropdownColor: colors.surface,
                              icon: const SizedBox.shrink(),
                              alignment: Alignment.center,
                              items: ProjectIcons.values.keys.map((key) {
                                final iconData = ProjectIcons.values[key]!;
                                return DropdownMenuItem(
                                  value: key,
                                  child: Center(
                                    child: Icon(
                                      iconData,
                                      color: _hexToColor(_selectedColor),
                                      size: 20,
                                    ),
                                  ),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) {
                                  setState(() => _selectedIcon = val);
                                }
                              },
                            ),
                          ),
                        ),
                        const SizedBox(width: 24),
                        // Color Selection
                        Expanded(
                          child: ColorPickerPanel(
                            selectedColor: _selectedColor,
                            onColorSelected: (hex) {
                              setState(() => _selectedColor = hex);
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                    decoration: BoxDecoration(
                      color: colors.surface,
                      borderRadius: const BorderRadius.only(
                        bottomLeft: Radius.circular(8),
                        bottomRight: Radius.circular(8),
                      ),
                      border: Border(
                        top: BorderSide(color: colors.divider),
                      ),
                    ),
                    child: Align(
                      alignment: Alignment.centerRight,
                      child: ElevatedButton(
                        onPressed: _saveChanges,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: projectColor,
                          foregroundColor: colors.background,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                          elevation: 0,
                          textStyle: TextStyle(
                            fontFamily: typography.fontFamily,
                            fontWeight: FontWeight.w500,
                            fontSize: 13,
                          ),
                        ),
                        child: const Text('Save changes'),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            Container(
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.05),
                border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Danger Zone',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.red.shade700,
                            fontFamily: typography.fontFamily,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Once you delete a project, there is no going back. Please be certain.',
                          style: TextStyle(
                            fontSize: 13,
                            color: colors.textMuted,
                            fontFamily: typography.fontFamily,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Divider(height: 1, color: Colors.red.withValues(alpha: 0.3)),
                  Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Delete this project',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: colors.text,
                            fontFamily: typography.fontFamily,
                          ),
                        ),
                        ElevatedButton(
                          onPressed: () => _showDeleteConfirmation(context),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red.shade600,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                            elevation: 0,
                          ),
                          child: const Text('Delete Project'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
