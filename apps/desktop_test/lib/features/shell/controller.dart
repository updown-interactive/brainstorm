import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:brainstorm/features/shell/state.dart';
import 'package:brainstorm/core/database/dao/project_settings_dao.dart';
import 'package:brainstorm/core/database/dao/project_dao.dart';
import 'package:brainstorm/core/database/brain_database.dart';
import 'package:drift/drift.dart';

class ShellCubit extends Cubit<ShellState> {
  final ProjectSettingsDao _settingsDao;
  final ProjectDao _projectDao;

  ShellCubit(this._settingsDao, this._projectDao) : super(const ShellState()) {
    _loadState();
  }

  SidebarControl _parseControlStr(String? str) {
    if (str == null) return SidebarControl.expanded;
    return SidebarControl.values.firstWhere(
      (e) => e.name == str,
      orElse: () => SidebarControl.expanded,
    );
  }

  Future<void> _loadState() async {
    final project = await _projectDao.getLatestProject();
    final projectsList = await _projectDao.getAllProjects();
    
    SidebarControl control = SidebarControl.expanded;
    if (project != null) {
      final controlStr = await _settingsDao.getSetting(project.id, 'sidebar_control');
      control = _parseControlStr(controlStr);
    }
    
    emit(state.copyWith(
      sidebarControl: control,
      selectedProject: project,
      projects: projectsList,
    ));
  }

  Future<void> loadSelectedProject() async {
    final project = await _projectDao.getLatestProject();
    final projectsList = await _projectDao.getAllProjects();
    
    SidebarControl control = SidebarControl.expanded;
    if (project != null) {
      final controlStr = await _settingsDao.getSetting(project.id, 'sidebar_control');
      control = _parseControlStr(controlStr);
    }

    emit(state.copyWith(
      sidebarControl: control,
      selectedProject: project,
      projects: projectsList,
    ));
  }

  void setSelectedProject(Project project) {
    // Also trigger loading of all projects to ensure state consistency
    loadSelectedProject();
  }

  Future<void> switchProject(Project project) async {
    final updated = project.copyWith(
      lastOpenedAt: Value(DateTime.now().millisecondsSinceEpoch),
    );
    await _projectDao.updateProject(updated);
    await _loadState();
  }

  Future<void> updateProject(Project project) async {
    final updated = project.copyWith(
      updatedAt: DateTime.now().millisecondsSinceEpoch,
    );
    await _projectDao.updateProject(updated);
    await _loadState();
  }

  Future<void> deleteProject(Project project) async {
    await _settingsDao.clearSettingsForProject(project.id);
    await _projectDao.deleteProject(project.id);
    await _loadState();
  }

  void changePage(int index) {
    emit(state.copyWith(selectedIndex: index));
  }

  void setHovered(bool isHovered) {
    emit(state.copyWith(isHovered: isHovered));
  }

  Future<void> setSidebarControl(SidebarControl control) async {
    emit(state.copyWith(sidebarControl: control));
    final project = state.selectedProject;
    if (project != null) {
      await _settingsDao.setSetting(project.id, 'sidebar_control', control.name);
    }
  }

  Future<void> toggleSidebar() async {
    final nextControl = state.sidebarControl == SidebarControl.collapsed
        ? SidebarControl.expanded
        : SidebarControl.collapsed;
    await setSidebarControl(nextControl);
  }
}
