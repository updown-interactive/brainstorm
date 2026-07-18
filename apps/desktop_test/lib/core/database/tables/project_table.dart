import 'package:drift/drift.dart';

@DataClassName('Project')
class ProjectTable extends Table {
  @override
  String get tableName => 'projects';

  TextColumn get id => text()();

  // Identity
  TextColumn get name => text()();
  TextColumn get description => text().nullable()();

  // Appearance
  TextColumn get icon => text().nullable()();
  IntColumn get color => integer().nullable()();
  TextColumn get banner => text().nullable()();

  // Storage
  TextColumn get path => text().customConstraint('NOT NULL UNIQUE')();

  // Project Type
  TextColumn get template => text().withDefault(const Constant('blank'))();

  // Versioning
  TextColumn get version => text().withDefault(const Constant('1.0.0'))();
  IntColumn get schemaVersion => integer().named('schema_version').withDefault(const Constant(1))();

  // Statistics (cached)
  IntColumn get documentCount => integer().named('document_count').withDefault(const Constant(0))();
  IntColumn get graphNodeCount => integer().named('graph_node_count').withDefault(const Constant(0))();
  IntColumn get chatCount => integer().named('chat_count').withDefault(const Constant(0))();
  IntColumn get taskCount => integer().named('task_count').withDefault(const Constant(0))();
  IntColumn get attachmentCount => integer().named('attachment_count').withDefault(const Constant(0))();

  // Status
  IntColumn get isFavorite => integer().named('is_favorite').withDefault(const Constant(0))();
  IntColumn get isArchived => integer().named('is_archived').withDefault(const Constant(0))();

  // Timestamps
  IntColumn get createdAt => integer().named('created_at')();
  IntColumn get updatedAt => integer().named('updated_at')();
  IntColumn get lastOpenedAt => integer().named('last_opened_at').nullable()();

  // Optional metadata
  TextColumn get metadata => text().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}
