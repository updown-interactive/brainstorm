import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:brainstorm/core/theme/theme.dart';
import 'package:brainstorm/core/database/brain_database.dart';
import 'package:brainstorm/core/database/dao/project_dao.dart';
import 'package:brainstorm/app/sl.dart';
import 'package:brainstorm/app/router.dart';
import 'package:brainstorm/shared/widgets/surface.dart';
import 'package:brainstorm/shared/widgets/color_picker_panel.dart';
import 'package:brainstorm/features/shell/controller.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:brainstorm/shared/utils/project_icons.dart';
import 'package:file_picker/file_picker.dart';


class ProjectOnboardingView extends StatefulWidget {
  const ProjectOnboardingView({super.key});

  @override
  State<ProjectOnboardingView> createState() => _ProjectOnboardingViewState();
}

class _ProjectOnboardingViewState extends State<ProjectOnboardingView> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descController = TextEditingController();

  String _selectedColor = '#10B981'; // Default Supabase green
  String _selectedIcon = 'workspaces';

  bool _isSubmitting = false;
  String _documentsPath = '';
  bool _canGoBack = false;


  @override
  void initState() {
    super.initState();
    _loadDocumentsDirectory();
    _checkIfProjectsExist();
  }

  Future<void> _checkIfProjectsExist() async {
    final hasProjects = await sl<ProjectDao>().hasProjects();
    if (mounted) {
      setState(() {
        _canGoBack = hasProjects;
      });
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _loadDocumentsDirectory() async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      setState(() {
        _documentsPath = directory.path;
      });
    } catch (_) {
      // Fallback
    }
  }

  Color _hexToColor(String hex) {
    final hexCode = hex.replaceAll('#', '');
    return Color(int.parse('FF$hexCode', radix: 16));
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;

    // Allow user to pick a parent directory for the project
    String? selectedDirectory;
    try {
      selectedDirectory = await FilePicker.getDirectoryPath(
        dialogTitle: 'Choose Workspace Location (Cancel for Documents)',
      );
    } catch (_) {
      // Ignore if unsupported or canceled
    }

    setState(() => _isSubmitting = true);

    try {
      final id = 'proj_${DateTime.now().microsecondsSinceEpoch}';
      final nowEpoch = DateTime.now().millisecondsSinceEpoch;
      
      final slug = _nameController.text.trim().toLowerCase().replaceAll(RegExp(r'[^a-z0-9_-]'), '_');
      final folderName = slug.isEmpty ? 'new_project' : slug;
      
      String generatedPath;
      if (selectedDirectory != null && selectedDirectory.isNotEmpty) {
        generatedPath = selectedDirectory;
      } else {
        final docs = _documentsPath.isEmpty ? '.' : _documentsPath;
        generatedPath = p.join(docs, folderName);
      }

      final project = Project(
        id: id,
        name: _nameController.text.trim(),
        description: _descController.text.trim().isEmpty ? null : _descController.text.trim(),
        icon: _selectedIcon,
        color: _hexToColor(_selectedColor).toARGB32(),
        path: generatedPath,
        template: 'blank',
        version: '1.0.0',
        schemaVersion: 1,
        documentCount: 0,
        graphNodeCount: 0,
        chatCount: 0,
        taskCount: 0,
        attachmentCount: 0,
        isFavorite: 0,
        isArchived: 0,
        createdAt: nowEpoch,
        updatedAt: nowEpoch,
      );

      // Insert into drift database
      await sl<ProjectDao>().insertProject(project);

      if (mounted) {
        // Refresh shell selected project
        context.read<ShellCubit>().setSelectedProject(project);
        // Navigate to shell
        context.pushReplacementTo(Routes.shell);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create project: ${e.toString()}'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final typography = context.typography;

    return Surface(
      toolBar: _canGoBack
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(width: 18),
                InkWell(
                  onTap: () => context.pushReplacementTo(Routes.shell),
                  borderRadius: BorderRadius.circular(6),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    child: Row(
                      children: [
                        Icon(Icons.arrow_back_ios_new_rounded, size: 12, color: colors.textMuted),
                      ],
                    ),
                  ),
                ),
              ],
            )
          : null,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
          child: Container(
            width: 580,
            padding: const EdgeInsets.all(40),
            decoration: BoxDecoration(
              color: colors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: colors.divider),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title Area
                  Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: _hexToColor(_selectedColor).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: _hexToColor(_selectedColor).withValues(alpha: 0.3)),
                        ),
                        child: Center(
                          child: Icon(
                            ProjectIcons.getIcon(_selectedIcon),
                            color: _hexToColor(_selectedColor),
                            size: 24,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Create a New Project',
                              style: TextStyle(
                                color: colors.text,
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                fontFamily: typography.fontFamily,
                              ),
                            ),
                            Text(
                              'Configure identity, storage, and style details.',
                              style: TextStyle(
                                color: colors.textMuted,
                                fontSize: 13,
                                fontFamily: typography.fontFamily,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                  Divider(color: colors.divider),
                  const SizedBox(height: 24),

                  // Project Name field
                  Text(
                    'Project Name *',
                    style: TextStyle(
                      color: colors.text,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      fontFamily: typography.fontFamily,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _nameController,
                    validator: (val) {
                      if (val == null || val.trim().isEmpty) {
                        return 'Project name is required';
                      }
                      return null;
                    },
                    decoration: InputDecoration(
                      hintText: 'My Amazing Project',
                      hintStyle: TextStyle(color: colors.textMuted.withValues(alpha: 0.5)),
                      filled: true,
                      fillColor: colors.background,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: colors.divider),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: colors.divider),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: _hexToColor(_selectedColor), width: 1.5),
                      ),
                    ),
                    style: TextStyle(color: colors.text, fontSize: 14),
                  ),
                  const SizedBox(height: 20),

                  // Description field
                  Text(
                    'Description',
                    style: TextStyle(
                      color: colors.text,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      fontFamily: typography.fontFamily,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _descController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      hintText: 'A hub for planning, notes, and visual brainstorming...',
                      hintStyle: TextStyle(color: colors.textMuted.withValues(alpha: 0.5)),
                      filled: true,
                      fillColor: colors.background,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: colors.divider),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: colors.divider),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: _hexToColor(_selectedColor), width: 1.5),
                      ),
                    ),
                    style: TextStyle(color: colors.text, fontSize: 14),
                  ),
                  const SizedBox(height: 20),



                  // Styling Selection Row (Icon & Color side-by-side)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Icon Selection
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Icon',
                            style: TextStyle(
                              color: colors.text,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              fontFamily: typography.fontFamily,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            width: 68,
                            height: 48,
                            padding: const EdgeInsets.symmetric(horizontal: 8),
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
                                icon: Icon(Icons.arrow_drop_down, color: colors.textMuted, size: 16),
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
                        ],
                      ),
                      const SizedBox(width: 24),
                      // Color selection
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Color',
                            style: TextStyle(
                              color: colors.text,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              fontFamily: typography.fontFamily,
                            ),
                          ),
                          const SizedBox(height: 8),
                          ColorPickerPanel(
                            selectedColor: _selectedColor,
                            onColorSelected: (hex) {
                              setState(() => _selectedColor = hex);
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 40),

                  // Actions
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      if (_canGoBack) ...[
                        TextButton(
                          onPressed: _isSubmitting ? null : () => context.pushReplacementTo(Routes.shell),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: Text(
                            'Cancel',
                            style: TextStyle(
                              color: colors.textMuted,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              fontFamily: typography.fontFamily,
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                      ],
                      ElevatedButton(
                        onPressed: _isSubmitting ? null : _submitForm,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _hexToColor(_selectedColor),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          elevation: 0,
                        ),
                        child: _isSubmitting
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : Text(
                                'Initialize Project',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  fontFamily: typography.fontFamily,
                                ),
                              ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
