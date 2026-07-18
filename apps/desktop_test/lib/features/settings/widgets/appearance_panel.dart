import 'package:brainstorm/app/sl.dart';
import 'package:brainstorm/core/database/brain_database.dart';
import 'package:brainstorm/core/theme/theme.dart';
import 'package:brainstorm/core/ui/toast/toast_cubit.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'panel_container.dart';

class AppearancePanel extends StatefulWidget {
  final Project? project;
  
  const AppearancePanel({super.key, this.project});

  @override
  State<AppearancePanel> createState() => _AppearancePanelState();
}

class _AppearancePanelState extends State<AppearancePanel> {
  List<AppTheme> _builtinThemes = [];

  @override
  void initState() {
    super.initState();
    _loadThemes();
  }
  
  Future<void> _loadThemes() async {
    final repo = sl<ThemeRepository>();
    final themes = await repo.builtin();
    if (mounted) {
      setState(() {
        _builtinThemes = themes;
      });
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

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final typography = context.typography;
    final projectColor = widget.project?.projectColor ?? colors.primary;

    return PanelContainer(
      title: 'Appearance',
      child: ListView(
        children: [
          // Global Theme Section
          Text(
            'Global Appearance',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: colors.text,
              fontFamily: typography.fontFamily,
            ),
          ),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: colors.divider),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                BlocBuilder<ThemeCubit, ThemeState>(
                  builder: (context, themeState) {
                    final currentThemeId = themeState.maybeWhen(
                      loaded: (theme) => theme.id,
                      orElse: () => 'dark',
                    );
                    
                    return _buildRow(
                      title: 'App Theme',
                      description: 'Choose the overall visual theme for the application.',
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: colors.background,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: colors.divider),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _builtinThemes.any((t) => t.id == currentThemeId) ? currentThemeId : null,
                            isExpanded: true,
                            dropdownColor: colors.surface,
                            hint: Text('Select Theme', style: TextStyle(color: colors.textMuted)),
                            icon: Icon(Icons.arrow_drop_down, color: colors.textMuted, size: 16),
                            items: _builtinThemes.map((theme) {
                              return DropdownMenuItem(
                                value: theme.id,
                                child: Text(
                                  theme.name,
                                  style: TextStyle(
                                    color: colors.text,
                                    fontFamily: typography.fontFamily,
                                    fontSize: 14,
                                  ),
                                ),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                final selectedTheme = _builtinThemes.firstWhere((t) => t.id == val);
                                context.read<ThemeCubit>().setTheme(selectedTheme);
                                
                                context.read<ToastCubit>().showToast(
                                  title: 'Theme Changed',
                                  message: 'Successfully applied the ${selectedTheme.name} theme.',
                                  icon: Icons.palette_outlined,
                                  color: projectColor,
                                );
                              }
                            },
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
