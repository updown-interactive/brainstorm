// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'project_settings_dao.dart';

// ignore_for_file: type=lint
mixin _$ProjectSettingsDaoMixin on DatabaseAccessor<BrainDatabase> {
  $ProjectTableTable get projectTable => attachedDatabase.projectTable;
  $ProjectSettingsTableTable get projectSettingsTable =>
      attachedDatabase.projectSettingsTable;
  ProjectSettingsDaoManager get managers => ProjectSettingsDaoManager(this);
}

class ProjectSettingsDaoManager {
  final _$ProjectSettingsDaoMixin _db;
  ProjectSettingsDaoManager(this._db);
  $$ProjectTableTableTableManager get projectTable =>
      $$ProjectTableTableTableManager(_db.attachedDatabase, _db.projectTable);
  $$ProjectSettingsTableTableTableManager get projectSettingsTable =>
      $$ProjectSettingsTableTableTableManager(
        _db.attachedDatabase,
        _db.projectSettingsTable,
      );
}
