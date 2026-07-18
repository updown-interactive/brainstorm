// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'project_dao.dart';

// ignore_for_file: type=lint
mixin _$ProjectDaoMixin on DatabaseAccessor<BrainDatabase> {
  $ProjectTableTable get projectTable => attachedDatabase.projectTable;
  ProjectDaoManager get managers => ProjectDaoManager(this);
}

class ProjectDaoManager {
  final _$ProjectDaoMixin _db;
  ProjectDaoManager(this._db);
  $$ProjectTableTableTableManager get projectTable =>
      $$ProjectTableTableTableManager(_db.attachedDatabase, _db.projectTable);
}
