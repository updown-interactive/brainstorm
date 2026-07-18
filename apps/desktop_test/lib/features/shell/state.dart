import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:brainstorm/core/database/brain_database.dart';

part 'state.freezed.dart';

enum SidebarControl {
  expanded,
  collapsed,
  expandOnHover,
}

@freezed
abstract class ShellState with _$ShellState {
  const factory ShellState({
    @Default(0) int selectedIndex,
    @Default(SidebarControl.expanded) SidebarControl sidebarControl,
    @Default(false) bool isHovered,
    Project? selectedProject,
    @Default([]) List<Project> projects,
  }) = _ShellState;
}
