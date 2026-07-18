import 'package:brainstorm/app/sl.dart';
import 'package:brainstorm/core/database/brain_database.dart';
import 'package:brainstorm/core/theme/theme.dart';
import 'package:brainstorm/features/settings/controller.dart';
import 'package:brainstorm/features/settings/state.dart';
import 'package:brainstorm/features/shell/controller.dart';
import 'package:brainstorm/features/shell/state.dart';
import 'package:flutter/material.dart';
import 'widgets/general_panel.dart';
import 'widgets/appearance_panel.dart';
import 'widgets/models_panel.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

class SettingsView extends StatelessWidget {
  const SettingsView({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<SettingsCubit>(),
      child: const _SettingsLayout(),
    );
  }
}

class _SettingsLayout extends StatelessWidget {
  const _SettingsLayout();

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Container(
      color: colors.background,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Sidebar
          const SizedBox(
            width: 200,
            child: _SettingsSidebar(),
          ),
          // Divider
          Container(
            width: 1,
            color: colors.divider,
          ),
          // Content
          Expanded(
            child: BlocBuilder<ShellCubit, ShellState>(
              builder: (context, shellState) {
                return BlocBuilder<SettingsCubit, SettingsState>(
                  builder: (context, state) {
                    switch (state.activeCategory) {
                      case SettingsCategory.general:
                        return GeneralPanel(project: shellState.selectedProject);
                      case SettingsCategory.appearance:
                        return AppearancePanel(project: shellState.selectedProject);
                      case SettingsCategory.models:
                        return const ModelsPanel();
                    }
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsSidebar extends StatelessWidget {
  const _SettingsSidebar();

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final typography = context.typography;

    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      children: [
        // Title
        Padding(
          padding: const EdgeInsets.only(left: 12, bottom: 24),
          child: Text(
            'Settings',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: colors.text,
              fontFamily: typography.fontFamily,
            ),
          ),
        ),
        // Project Settings Section
        _SectionTitle(title: 'Project Settings'),
        const SizedBox(height: 8),
        _CategoryItem(
          title: 'General',
          icon: Icons.settings_outlined,
          category: SettingsCategory.general,
        ),
        _CategoryItem(
          title: 'Models',
          icon: Icons.smart_toy_outlined,
          category: SettingsCategory.models,
        ),

        const SizedBox(height: 24),

        // App Settings Section
        _SectionTitle(title: 'App Settings'),
        const SizedBox(height: 8),
        _CategoryItem(
          title: 'Appearance',
          icon: Icons.color_lens_outlined,
          category: SettingsCategory.appearance,
        ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final typography = context.typography;

    return Padding(
      padding: const EdgeInsets.only(left: 12, bottom: 4),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5,
          color: colors.textMuted,
          fontFamily: typography.fontFamily,
        ),
      ),
    );
  }
}

class _CategoryItem extends StatefulWidget {
  final String title;
  final IconData icon;
  final SettingsCategory category;

  const _CategoryItem({
    required this.title,
    required this.icon,
    required this.category,
  });

  @override
  State<_CategoryItem> createState() => _CategoryItemState();
}

class _CategoryItemState extends State<_CategoryItem> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final typography = context.typography;
    final cubit = context.read<SettingsCubit>();

    return BlocBuilder<ShellCubit, ShellState>(
      builder: (context, shellState) {
        final projectColor = shellState.selectedProject?.projectColor ?? colors.primary;

        return BlocBuilder<SettingsCubit, SettingsState>(
          builder: (context, state) {
            final isSelected = state.activeCategory == widget.category;
            
            return MouseRegion(
              onEnter: (_) => setState(() => _isHovered = true),
              onExit: (_) => setState(() => _isHovered = false),
              cursor: SystemMouseCursors.click,
              child: GestureDetector(
                onTap: () => cubit.selectCategory(widget.category),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected 
                        ? projectColor.withAlpha(38) 
                        : (_isHovered ? colors.hover : Colors.transparent),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        widget.icon,
                        size: 18,
                        color: isSelected ? projectColor : colors.textMuted,
                      ),
                      const SizedBox(width: 12),
                      Text(
                        widget.title,
                        style: TextStyle(
                          fontSize: 14,
                          color: isSelected ? projectColor : colors.text,
                          fontFamily: typography.fontFamily,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}

