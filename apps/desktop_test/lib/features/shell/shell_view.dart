import 'package:brainstorm/features/chat/chat_view.dart';
import 'package:brainstorm/features/files/files_view.dart';
import 'package:brainstorm/features/graph/graph_view.dart';
import 'package:brainstorm/features/settings/settings_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:brainstorm/core/theme/theme.dart';
import 'package:brainstorm/features/shell/controller.dart';
import 'package:brainstorm/features/shell/state.dart';
import 'package:brainstorm/shared/utils/project_icons.dart';
import 'package:brainstorm/shared/widgets/surface.dart';
import 'package:brainstorm/core/database/brain_database.dart';
import 'package:brainstorm/app/router.dart';

class ShellView extends StatelessWidget {
  const ShellView({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ShellCubit, ShellState>(
      builder: (context, state) {
        final colors = context.colors;
        final typography = context.typography;
        final isCurrentlyCollapsed =
            state.sidebarControl == SidebarControl.collapsed ||
            (state.sidebarControl == SidebarControl.expandOnHover &&
                !state.isHovered);

        return Surface(
          logoColor: state.selectedProject?.projectColor,
          toolBar: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(width: 18),
              if (state.selectedProject != null) ...[
                PopupMenuButton<String>(
                  tooltip: 'Manage Projects',
                  offset: const Offset(0, 30),
                  color: colors.surface,
                  child: MouseRegion(
                    cursor: SystemMouseCursors.click,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 20,
                          height: 20,
                          decoration: BoxDecoration(
                            color:
                                (state.selectedProject?.projectColor ??
                                        colors.primary)
                                    .withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(5),
                            border: Border.all(
                              color:
                                  (state.selectedProject?.projectColor ??
                                          colors.primary)
                                      .withValues(alpha: 0.4),
                              width: 1,
                            ),
                          ),
                          child: Center(
                            child: Icon(
                              ProjectIcons.getIcon(state.selectedProject!.icon),
                              color:
                                  state.selectedProject?.projectColor ??
                                  colors.primary,
                              size: 12,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          state.selectedProject!.name,
                          style: TextStyle(
                            color: colors.text,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            fontFamily: typography.fontFamily,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(
                          Icons.unfold_more_rounded,
                          size: 14,
                          color: colors.textMuted,
                        ),
                      ],
                    ),
                  ),
                  itemBuilder: (context) {
                    return [
                      PopupMenuItem<String>(
                        enabled: false,
                        child: Text(
                          'SELECT PROJECT',
                          style: TextStyle(
                            color: colors.textMuted,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            fontFamily: typography.fontFamily,
                          ),
                        ),
                      ),
                      ...state.projects.map((proj) {
                        final isSelected = state.selectedProject?.id == proj.id;
                        final pColor = proj.projectColor ?? colors.primary;
                        return PopupMenuItem<String>(
                          value: 'switch_${proj.id}',
                          child: Row(
                            children: [
                              Icon(
                                ProjectIcons.getIcon(proj.icon),
                                color: pColor,
                                size: 16,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  proj.name,
                                  style: TextStyle(
                                    color: colors.text,
                                    fontSize: 13,
                                    fontWeight: isSelected
                                        ? FontWeight.bold
                                        : FontWeight.normal,
                                    fontFamily: typography.fontFamily,
                                  ),
                                ),
                              ),
                              if (isSelected)
                                Icon(
                                  Icons.check_rounded,
                                  color: pColor,
                                  size: 16,
                                ),
                            ],
                          ),
                        );
                      }),
                      const PopupMenuDivider(),
                      PopupMenuItem<String>(
                        value: 'create_new',
                        child: Row(
                          children: [
                            Icon(
                              Icons.add_rounded,
                              color: colors.textMuted,
                              size: 16,
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'Create New Project',
                              style: TextStyle(
                                color: colors.text,
                                fontSize: 13,
                                fontFamily: typography.fontFamily,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ];
                  },
                  onSelected: (value) {
                    if (value == 'create_new') {
                      context.pushReplacementTo(Routes.projectOnboarding);
                    } else if (value.startsWith('switch_')) {
                      final projId = value.substring(7);
                      final target = state.projects.firstWhere(
                        (p) => p.id == projId,
                      );
                      context.read<ShellCubit>().switchProject(target);
                    }
                  },
                ),
              ] else ...[
                Icon(
                  Icons.workspaces_rounded,
                  color: colors.textMuted,
                  size: 16,
                ),
                const SizedBox(width: 8),
                Text(
                  'No Project Selected',
                  style: TextStyle(
                    color: colors.textMuted,
                    fontSize: 13,
                    fontFamily: typography.fontFamily,
                  ),
                ),
              ],
            ],
          ),
          body: Row(
            children: [
              // COLLAPSIBLE SIDEBAR
              MouseRegion(
                onEnter: (_) => context.read<ShellCubit>().setHovered(true),
                onExit: (_) => context.read<ShellCubit>().setHovered(false),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  curve: Curves.easeInOut,
                  width: isCurrentlyCollapsed ? 64.0 : 200.0,
                  color: colors.sidebar,
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final isCollapsed = constraints.maxWidth < 120;
                      return Column(
                        children: [
                          const SizedBox(height: 16),
                          // Nav Items
                          Expanded(
                            child: _buildNavList(
                              context,
                              isCollapsed,
                              state.selectedIndex,
                              state.selectedProject,
                            ),
                          ),
                          // Footer
                          _buildFooter(context, isCollapsed, state),
                        ],
                      );
                    },
                  ),
                ),
              ),
              // Divider
              Container(width: 1, color: colors.divider),
              // Main content
              Expanded(
                child: Container(
                  color: colors.background,
                  child: IndexedStack(
                    index: state.selectedIndex,
                    children: [ChatView(), FilesView(), GraphView(), const SettingsView()],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildNavList(
    BuildContext context,
    bool isCollapsed,
    int selectedIndex,
    Project? selectedProject,
  ) {
    final colors = context.colors;
    final items = [
      _NavItemData(
        icon: Icons.chat_bubble_outline,
        activeIcon: Icons.chat_bubble,
        label: 'Chat',
      ),
      _NavItemData(
        icon: Icons.folder_open,
        activeIcon: Icons.folder,
        label: 'Files',
      ),
      _NavItemData(
        icon: Icons.scatter_plot_outlined,
        activeIcon: Icons.scatter_plot,
        label: 'Graph',
      ),
    ];

    final activeColor = selectedProject?.projectColor ?? colors.primary;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ListView.builder(
          shrinkWrap: true,
          itemCount: items.length,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          itemBuilder: (context, index) {
            final item = items[index];
            final isSelected = selectedIndex == index;
            return _NavListItemWidget(
              item: item,
              isSelected: isSelected,
              isCollapsed: isCollapsed,
              onTap: () {
                context.read<ShellCubit>().changePage(index);
              },
              activeColor: activeColor,
            );
          },
        ),
        const SizedBox(height: 8),
        Divider(color: colors.divider, height: 1, indent: 16, endIndent: 16),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: _NavListItemWidget(
            item: _NavItemData(
              icon: Icons.settings_outlined,
              activeIcon: Icons.settings,
              label: 'Project Settings',
            ),
            isSelected: selectedIndex == 3,
            isCollapsed: isCollapsed,
            onTap: () {
              context.read<ShellCubit>().changePage(3);
            },
            activeColor: activeColor,
          ),
        ),
      ],
    );
  }

  Widget _buildFooter(
    BuildContext context,
    bool isCollapsed,
    ShellState state,
  ) {
    final currentControl = state.sidebarControl;
    final colors = context.colors;
    final typography = context.typography;
    final activeColor = state.selectedProject?.projectColor;

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          child: Column(
            children: [
              // Sidebar Layout Options Popup Menu Button
              Row(
                mainAxisAlignment: MainAxisAlignment.start,
                children: [
                  const SizedBox(width: 6),
                  Theme(
                    data: Theme.of(context).copyWith(cardColor: colors.surface),
                    child: PopupMenuButton<SidebarControl>(
                      tooltip: 'Sidebar Settings',
                      offset: isCollapsed
                          ? const Offset(50, -140)
                          : const Offset(0, -140),
                      color: colors.surface,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                        side: BorderSide(color: colors.divider),
                      ),
                      icon: Icon(
                        Icons.view_sidebar_outlined,
                        color: colors.textMuted,
                        size: 20,
                      ),
                      itemBuilder: (context) => [
                        PopupMenuItem(
                          value: SidebarControl.expanded,
                          child: Row(
                            children: [
                              Icon(
                                Icons.menu_open_rounded,
                                size: 18,
                                color: currentControl == SidebarControl.expanded
                                    ? activeColor
                                    : colors.textMuted,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Always Expanded',
                                style: TextStyle(
                                  color: colors.text,
                                  fontSize: 13,
                                  fontFamily: typography.fontFamily,
                                ),
                              ),
                              const SizedBox(width: 16),
                              if (currentControl == SidebarControl.expanded)
                                Icon(
                                  Icons.check_rounded,
                                  color: activeColor,
                                  size: 16,
                                ),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: SidebarControl.collapsed,
                          child: Row(
                            children: [
                              Icon(
                                Icons.menu_rounded,
                                size: 18,
                                color:
                                    currentControl == SidebarControl.collapsed
                                    ? activeColor
                                    : colors.textMuted,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Always Collapsed',
                                style: TextStyle(
                                  color: colors.text,
                                  fontSize: 13,
                                  fontFamily: typography.fontFamily,
                                ),
                              ),
                              const SizedBox(width: 16),
                              if (currentControl == SidebarControl.collapsed)
                                Icon(
                                  Icons.check_rounded,
                                  color: activeColor,
                                  size: 16,
                                ),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: SidebarControl.expandOnHover,
                          child: Row(
                            children: [
                              Icon(
                                Icons.mouse_rounded,
                                size: 18,
                                color:
                                    currentControl ==
                                        SidebarControl.expandOnHover
                                    ? activeColor
                                    : colors.textMuted,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Expand on Hover',
                                style: TextStyle(
                                  color: colors.text,
                                  fontSize: 13,
                                  fontFamily: typography.fontFamily,
                                ),
                              ),
                              const SizedBox(width: 16),
                              if (currentControl ==
                                  SidebarControl.expandOnHover)
                                Icon(
                                  Icons.check_rounded,
                                  color: activeColor,
                                  size: 16,
                                ),
                            ],
                          ),
                        ),
                      ],
                      onSelected: (control) {
                        context.read<ShellCubit>().setSidebarControl(control);
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _NavItemData {
  final IconData icon;
  final IconData activeIcon;
  final String label;

  _NavItemData({
    required this.icon,
    required this.activeIcon,
    required this.label,
  });
}

class _NavListItemWidget extends StatefulWidget {
  final _NavItemData item;
  final bool isSelected;
  final bool isCollapsed;
  final VoidCallback onTap;
  final Color activeColor;

  const _NavListItemWidget({
    required this.item,
    required this.isSelected,
    required this.isCollapsed,
    required this.onTap,
    required this.activeColor,
  });

  @override
  State<_NavListItemWidget> createState() => _NavListItemWidgetState();
}

class _NavListItemWidgetState extends State<_NavListItemWidget> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    final Widget content = Container(
      height: 48,
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: widget.isSelected
            ? colors.hover
            : (_isHovered
                  ? colors.hover.withValues(alpha: .5)
                  : Colors.transparent),
        borderRadius: BorderRadius.circular(10),
        border: widget.isSelected
            ? Border(left: BorderSide(color: widget.activeColor, width: 3))
            : null,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.start,
        children: [
          const SizedBox(width: 14),
          Icon(
            widget.isSelected ? widget.item.activeIcon : widget.item.icon,
            size: 20,
            color: widget.isSelected ? colors.text : colors.textMuted,
          ),
          Flexible(
            fit: FlexFit.loose,
            child: _AnimatedSidebarText(
              isCollapsed: widget.isCollapsed,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(width: 12),
                  Flexible(
                    child: Text(
                      widget.item.label,
                      maxLines: 1,
                      softWrap: false,
                      overflow: TextOverflow.clip,
                      style: TextStyle(
                        color: widget.isSelected
                            ? colors.text
                            : colors.textMuted,
                        fontSize: context.typography.body,
                        fontFamily: context.typography.fontFamily,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: widget.onTap,
        child: widget.isCollapsed
            ? Tooltip(
                message: widget.item.label,
                margin: const EdgeInsets.only(left: 20),
                decoration: BoxDecoration(
                  color: colors.surfaceVariant,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: colors.divider),
                ),
                textStyle: TextStyle(
                  color: colors.text,
                  fontSize: 12,
                  fontFamily: context.typography.fontFamily,
                ),
                child: content,
              )
            : content,
      ),
    );
  }
}

class _AnimatedSidebarText extends StatelessWidget {
  final bool isCollapsed;
  final Widget child;

  const _AnimatedSidebarText({required this.isCollapsed, required this.child});

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: isCollapsed ? 0.0 : 1.0,
      duration: const Duration(milliseconds: 150),
      curve: Curves.easeInOut,
      child: AnimatedSize(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        alignment: Alignment.centerLeft,
        child: isCollapsed ? const SizedBox.shrink() : child,
      ),
    );
  }
}
