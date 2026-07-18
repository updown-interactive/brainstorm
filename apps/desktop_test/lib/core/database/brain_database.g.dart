// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'brain_database.dart';

// ignore_for_file: type=lint
class $ProjectTableTable extends ProjectTable
    with TableInfo<$ProjectTableTable, Project> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ProjectTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _descriptionMeta = const VerificationMeta(
    'description',
  );
  @override
  late final GeneratedColumn<String> description = GeneratedColumn<String>(
    'description',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _iconMeta = const VerificationMeta('icon');
  @override
  late final GeneratedColumn<String> icon = GeneratedColumn<String>(
    'icon',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _colorMeta = const VerificationMeta('color');
  @override
  late final GeneratedColumn<int> color = GeneratedColumn<int>(
    'color',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _bannerMeta = const VerificationMeta('banner');
  @override
  late final GeneratedColumn<String> banner = GeneratedColumn<String>(
    'banner',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _pathMeta = const VerificationMeta('path');
  @override
  late final GeneratedColumn<String> path = GeneratedColumn<String>(
    'path',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
    $customConstraints: 'NOT NULL UNIQUE',
  );
  static const VerificationMeta _templateMeta = const VerificationMeta(
    'template',
  );
  @override
  late final GeneratedColumn<String> template = GeneratedColumn<String>(
    'template',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('blank'),
  );
  static const VerificationMeta _versionMeta = const VerificationMeta(
    'version',
  );
  @override
  late final GeneratedColumn<String> version = GeneratedColumn<String>(
    'version',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('1.0.0'),
  );
  static const VerificationMeta _schemaVersionMeta = const VerificationMeta(
    'schemaVersion',
  );
  @override
  late final GeneratedColumn<int> schemaVersion = GeneratedColumn<int>(
    'schema_version',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  static const VerificationMeta _documentCountMeta = const VerificationMeta(
    'documentCount',
  );
  @override
  late final GeneratedColumn<int> documentCount = GeneratedColumn<int>(
    'document_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _graphNodeCountMeta = const VerificationMeta(
    'graphNodeCount',
  );
  @override
  late final GeneratedColumn<int> graphNodeCount = GeneratedColumn<int>(
    'graph_node_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _chatCountMeta = const VerificationMeta(
    'chatCount',
  );
  @override
  late final GeneratedColumn<int> chatCount = GeneratedColumn<int>(
    'chat_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _taskCountMeta = const VerificationMeta(
    'taskCount',
  );
  @override
  late final GeneratedColumn<int> taskCount = GeneratedColumn<int>(
    'task_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _attachmentCountMeta = const VerificationMeta(
    'attachmentCount',
  );
  @override
  late final GeneratedColumn<int> attachmentCount = GeneratedColumn<int>(
    'attachment_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _isFavoriteMeta = const VerificationMeta(
    'isFavorite',
  );
  @override
  late final GeneratedColumn<int> isFavorite = GeneratedColumn<int>(
    'is_favorite',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _isArchivedMeta = const VerificationMeta(
    'isArchived',
  );
  @override
  late final GeneratedColumn<int> isArchived = GeneratedColumn<int>(
    'is_archived',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _lastOpenedAtMeta = const VerificationMeta(
    'lastOpenedAt',
  );
  @override
  late final GeneratedColumn<int> lastOpenedAt = GeneratedColumn<int>(
    'last_opened_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _metadataMeta = const VerificationMeta(
    'metadata',
  );
  @override
  late final GeneratedColumn<String> metadata = GeneratedColumn<String>(
    'metadata',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    name,
    description,
    icon,
    color,
    banner,
    path,
    template,
    version,
    schemaVersion,
    documentCount,
    graphNodeCount,
    chatCount,
    taskCount,
    attachmentCount,
    isFavorite,
    isArchived,
    createdAt,
    updatedAt,
    lastOpenedAt,
    metadata,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'projects';
  @override
  VerificationContext validateIntegrity(
    Insertable<Project> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('description')) {
      context.handle(
        _descriptionMeta,
        description.isAcceptableOrUnknown(
          data['description']!,
          _descriptionMeta,
        ),
      );
    }
    if (data.containsKey('icon')) {
      context.handle(
        _iconMeta,
        icon.isAcceptableOrUnknown(data['icon']!, _iconMeta),
      );
    }
    if (data.containsKey('color')) {
      context.handle(
        _colorMeta,
        color.isAcceptableOrUnknown(data['color']!, _colorMeta),
      );
    }
    if (data.containsKey('banner')) {
      context.handle(
        _bannerMeta,
        banner.isAcceptableOrUnknown(data['banner']!, _bannerMeta),
      );
    }
    if (data.containsKey('path')) {
      context.handle(
        _pathMeta,
        path.isAcceptableOrUnknown(data['path']!, _pathMeta),
      );
    } else if (isInserting) {
      context.missing(_pathMeta);
    }
    if (data.containsKey('template')) {
      context.handle(
        _templateMeta,
        template.isAcceptableOrUnknown(data['template']!, _templateMeta),
      );
    }
    if (data.containsKey('version')) {
      context.handle(
        _versionMeta,
        version.isAcceptableOrUnknown(data['version']!, _versionMeta),
      );
    }
    if (data.containsKey('schema_version')) {
      context.handle(
        _schemaVersionMeta,
        schemaVersion.isAcceptableOrUnknown(
          data['schema_version']!,
          _schemaVersionMeta,
        ),
      );
    }
    if (data.containsKey('document_count')) {
      context.handle(
        _documentCountMeta,
        documentCount.isAcceptableOrUnknown(
          data['document_count']!,
          _documentCountMeta,
        ),
      );
    }
    if (data.containsKey('graph_node_count')) {
      context.handle(
        _graphNodeCountMeta,
        graphNodeCount.isAcceptableOrUnknown(
          data['graph_node_count']!,
          _graphNodeCountMeta,
        ),
      );
    }
    if (data.containsKey('chat_count')) {
      context.handle(
        _chatCountMeta,
        chatCount.isAcceptableOrUnknown(data['chat_count']!, _chatCountMeta),
      );
    }
    if (data.containsKey('task_count')) {
      context.handle(
        _taskCountMeta,
        taskCount.isAcceptableOrUnknown(data['task_count']!, _taskCountMeta),
      );
    }
    if (data.containsKey('attachment_count')) {
      context.handle(
        _attachmentCountMeta,
        attachmentCount.isAcceptableOrUnknown(
          data['attachment_count']!,
          _attachmentCountMeta,
        ),
      );
    }
    if (data.containsKey('is_favorite')) {
      context.handle(
        _isFavoriteMeta,
        isFavorite.isAcceptableOrUnknown(data['is_favorite']!, _isFavoriteMeta),
      );
    }
    if (data.containsKey('is_archived')) {
      context.handle(
        _isArchivedMeta,
        isArchived.isAcceptableOrUnknown(data['is_archived']!, _isArchivedMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('last_opened_at')) {
      context.handle(
        _lastOpenedAtMeta,
        lastOpenedAt.isAcceptableOrUnknown(
          data['last_opened_at']!,
          _lastOpenedAtMeta,
        ),
      );
    }
    if (data.containsKey('metadata')) {
      context.handle(
        _metadataMeta,
        metadata.isAcceptableOrUnknown(data['metadata']!, _metadataMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Project map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Project(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      description: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}description'],
      ),
      icon: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}icon'],
      ),
      color: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}color'],
      ),
      banner: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}banner'],
      ),
      path: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}path'],
      )!,
      template: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}template'],
      )!,
      version: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}version'],
      )!,
      schemaVersion: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}schema_version'],
      )!,
      documentCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}document_count'],
      )!,
      graphNodeCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}graph_node_count'],
      )!,
      chatCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}chat_count'],
      )!,
      taskCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}task_count'],
      )!,
      attachmentCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}attachment_count'],
      )!,
      isFavorite: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}is_favorite'],
      )!,
      isArchived: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}is_archived'],
      )!,
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}created_at'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}updated_at'],
      )!,
      lastOpenedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}last_opened_at'],
      ),
      metadata: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}metadata'],
      ),
    );
  }

  @override
  $ProjectTableTable createAlias(String alias) {
    return $ProjectTableTable(attachedDatabase, alias);
  }
}

class Project extends DataClass implements Insertable<Project> {
  final String id;
  final String name;
  final String? description;
  final String? icon;
  final int? color;
  final String? banner;
  final String path;
  final String template;
  final String version;
  final int schemaVersion;
  final int documentCount;
  final int graphNodeCount;
  final int chatCount;
  final int taskCount;
  final int attachmentCount;
  final int isFavorite;
  final int isArchived;
  final int createdAt;
  final int updatedAt;
  final int? lastOpenedAt;
  final String? metadata;
  const Project({
    required this.id,
    required this.name,
    this.description,
    this.icon,
    this.color,
    this.banner,
    required this.path,
    required this.template,
    required this.version,
    required this.schemaVersion,
    required this.documentCount,
    required this.graphNodeCount,
    required this.chatCount,
    required this.taskCount,
    required this.attachmentCount,
    required this.isFavorite,
    required this.isArchived,
    required this.createdAt,
    required this.updatedAt,
    this.lastOpenedAt,
    this.metadata,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || description != null) {
      map['description'] = Variable<String>(description);
    }
    if (!nullToAbsent || icon != null) {
      map['icon'] = Variable<String>(icon);
    }
    if (!nullToAbsent || color != null) {
      map['color'] = Variable<int>(color);
    }
    if (!nullToAbsent || banner != null) {
      map['banner'] = Variable<String>(banner);
    }
    map['path'] = Variable<String>(path);
    map['template'] = Variable<String>(template);
    map['version'] = Variable<String>(version);
    map['schema_version'] = Variable<int>(schemaVersion);
    map['document_count'] = Variable<int>(documentCount);
    map['graph_node_count'] = Variable<int>(graphNodeCount);
    map['chat_count'] = Variable<int>(chatCount);
    map['task_count'] = Variable<int>(taskCount);
    map['attachment_count'] = Variable<int>(attachmentCount);
    map['is_favorite'] = Variable<int>(isFavorite);
    map['is_archived'] = Variable<int>(isArchived);
    map['created_at'] = Variable<int>(createdAt);
    map['updated_at'] = Variable<int>(updatedAt);
    if (!nullToAbsent || lastOpenedAt != null) {
      map['last_opened_at'] = Variable<int>(lastOpenedAt);
    }
    if (!nullToAbsent || metadata != null) {
      map['metadata'] = Variable<String>(metadata);
    }
    return map;
  }

  ProjectTableCompanion toCompanion(bool nullToAbsent) {
    return ProjectTableCompanion(
      id: Value(id),
      name: Value(name),
      description: description == null && nullToAbsent
          ? const Value.absent()
          : Value(description),
      icon: icon == null && nullToAbsent ? const Value.absent() : Value(icon),
      color: color == null && nullToAbsent
          ? const Value.absent()
          : Value(color),
      banner: banner == null && nullToAbsent
          ? const Value.absent()
          : Value(banner),
      path: Value(path),
      template: Value(template),
      version: Value(version),
      schemaVersion: Value(schemaVersion),
      documentCount: Value(documentCount),
      graphNodeCount: Value(graphNodeCount),
      chatCount: Value(chatCount),
      taskCount: Value(taskCount),
      attachmentCount: Value(attachmentCount),
      isFavorite: Value(isFavorite),
      isArchived: Value(isArchived),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      lastOpenedAt: lastOpenedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastOpenedAt),
      metadata: metadata == null && nullToAbsent
          ? const Value.absent()
          : Value(metadata),
    );
  }

  factory Project.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Project(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      description: serializer.fromJson<String?>(json['description']),
      icon: serializer.fromJson<String?>(json['icon']),
      color: serializer.fromJson<int?>(json['color']),
      banner: serializer.fromJson<String?>(json['banner']),
      path: serializer.fromJson<String>(json['path']),
      template: serializer.fromJson<String>(json['template']),
      version: serializer.fromJson<String>(json['version']),
      schemaVersion: serializer.fromJson<int>(json['schemaVersion']),
      documentCount: serializer.fromJson<int>(json['documentCount']),
      graphNodeCount: serializer.fromJson<int>(json['graphNodeCount']),
      chatCount: serializer.fromJson<int>(json['chatCount']),
      taskCount: serializer.fromJson<int>(json['taskCount']),
      attachmentCount: serializer.fromJson<int>(json['attachmentCount']),
      isFavorite: serializer.fromJson<int>(json['isFavorite']),
      isArchived: serializer.fromJson<int>(json['isArchived']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
      lastOpenedAt: serializer.fromJson<int?>(json['lastOpenedAt']),
      metadata: serializer.fromJson<String?>(json['metadata']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'description': serializer.toJson<String?>(description),
      'icon': serializer.toJson<String?>(icon),
      'color': serializer.toJson<int?>(color),
      'banner': serializer.toJson<String?>(banner),
      'path': serializer.toJson<String>(path),
      'template': serializer.toJson<String>(template),
      'version': serializer.toJson<String>(version),
      'schemaVersion': serializer.toJson<int>(schemaVersion),
      'documentCount': serializer.toJson<int>(documentCount),
      'graphNodeCount': serializer.toJson<int>(graphNodeCount),
      'chatCount': serializer.toJson<int>(chatCount),
      'taskCount': serializer.toJson<int>(taskCount),
      'attachmentCount': serializer.toJson<int>(attachmentCount),
      'isFavorite': serializer.toJson<int>(isFavorite),
      'isArchived': serializer.toJson<int>(isArchived),
      'createdAt': serializer.toJson<int>(createdAt),
      'updatedAt': serializer.toJson<int>(updatedAt),
      'lastOpenedAt': serializer.toJson<int?>(lastOpenedAt),
      'metadata': serializer.toJson<String?>(metadata),
    };
  }

  Project copyWith({
    String? id,
    String? name,
    Value<String?> description = const Value.absent(),
    Value<String?> icon = const Value.absent(),
    Value<int?> color = const Value.absent(),
    Value<String?> banner = const Value.absent(),
    String? path,
    String? template,
    String? version,
    int? schemaVersion,
    int? documentCount,
    int? graphNodeCount,
    int? chatCount,
    int? taskCount,
    int? attachmentCount,
    int? isFavorite,
    int? isArchived,
    int? createdAt,
    int? updatedAt,
    Value<int?> lastOpenedAt = const Value.absent(),
    Value<String?> metadata = const Value.absent(),
  }) => Project(
    id: id ?? this.id,
    name: name ?? this.name,
    description: description.present ? description.value : this.description,
    icon: icon.present ? icon.value : this.icon,
    color: color.present ? color.value : this.color,
    banner: banner.present ? banner.value : this.banner,
    path: path ?? this.path,
    template: template ?? this.template,
    version: version ?? this.version,
    schemaVersion: schemaVersion ?? this.schemaVersion,
    documentCount: documentCount ?? this.documentCount,
    graphNodeCount: graphNodeCount ?? this.graphNodeCount,
    chatCount: chatCount ?? this.chatCount,
    taskCount: taskCount ?? this.taskCount,
    attachmentCount: attachmentCount ?? this.attachmentCount,
    isFavorite: isFavorite ?? this.isFavorite,
    isArchived: isArchived ?? this.isArchived,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    lastOpenedAt: lastOpenedAt.present ? lastOpenedAt.value : this.lastOpenedAt,
    metadata: metadata.present ? metadata.value : this.metadata,
  );
  Project copyWithCompanion(ProjectTableCompanion data) {
    return Project(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      description: data.description.present
          ? data.description.value
          : this.description,
      icon: data.icon.present ? data.icon.value : this.icon,
      color: data.color.present ? data.color.value : this.color,
      banner: data.banner.present ? data.banner.value : this.banner,
      path: data.path.present ? data.path.value : this.path,
      template: data.template.present ? data.template.value : this.template,
      version: data.version.present ? data.version.value : this.version,
      schemaVersion: data.schemaVersion.present
          ? data.schemaVersion.value
          : this.schemaVersion,
      documentCount: data.documentCount.present
          ? data.documentCount.value
          : this.documentCount,
      graphNodeCount: data.graphNodeCount.present
          ? data.graphNodeCount.value
          : this.graphNodeCount,
      chatCount: data.chatCount.present ? data.chatCount.value : this.chatCount,
      taskCount: data.taskCount.present ? data.taskCount.value : this.taskCount,
      attachmentCount: data.attachmentCount.present
          ? data.attachmentCount.value
          : this.attachmentCount,
      isFavorite: data.isFavorite.present
          ? data.isFavorite.value
          : this.isFavorite,
      isArchived: data.isArchived.present
          ? data.isArchived.value
          : this.isArchived,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      lastOpenedAt: data.lastOpenedAt.present
          ? data.lastOpenedAt.value
          : this.lastOpenedAt,
      metadata: data.metadata.present ? data.metadata.value : this.metadata,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Project(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('description: $description, ')
          ..write('icon: $icon, ')
          ..write('color: $color, ')
          ..write('banner: $banner, ')
          ..write('path: $path, ')
          ..write('template: $template, ')
          ..write('version: $version, ')
          ..write('schemaVersion: $schemaVersion, ')
          ..write('documentCount: $documentCount, ')
          ..write('graphNodeCount: $graphNodeCount, ')
          ..write('chatCount: $chatCount, ')
          ..write('taskCount: $taskCount, ')
          ..write('attachmentCount: $attachmentCount, ')
          ..write('isFavorite: $isFavorite, ')
          ..write('isArchived: $isArchived, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastOpenedAt: $lastOpenedAt, ')
          ..write('metadata: $metadata')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
    id,
    name,
    description,
    icon,
    color,
    banner,
    path,
    template,
    version,
    schemaVersion,
    documentCount,
    graphNodeCount,
    chatCount,
    taskCount,
    attachmentCount,
    isFavorite,
    isArchived,
    createdAt,
    updatedAt,
    lastOpenedAt,
    metadata,
  ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Project &&
          other.id == this.id &&
          other.name == this.name &&
          other.description == this.description &&
          other.icon == this.icon &&
          other.color == this.color &&
          other.banner == this.banner &&
          other.path == this.path &&
          other.template == this.template &&
          other.version == this.version &&
          other.schemaVersion == this.schemaVersion &&
          other.documentCount == this.documentCount &&
          other.graphNodeCount == this.graphNodeCount &&
          other.chatCount == this.chatCount &&
          other.taskCount == this.taskCount &&
          other.attachmentCount == this.attachmentCount &&
          other.isFavorite == this.isFavorite &&
          other.isArchived == this.isArchived &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.lastOpenedAt == this.lastOpenedAt &&
          other.metadata == this.metadata);
}

class ProjectTableCompanion extends UpdateCompanion<Project> {
  final Value<String> id;
  final Value<String> name;
  final Value<String?> description;
  final Value<String?> icon;
  final Value<int?> color;
  final Value<String?> banner;
  final Value<String> path;
  final Value<String> template;
  final Value<String> version;
  final Value<int> schemaVersion;
  final Value<int> documentCount;
  final Value<int> graphNodeCount;
  final Value<int> chatCount;
  final Value<int> taskCount;
  final Value<int> attachmentCount;
  final Value<int> isFavorite;
  final Value<int> isArchived;
  final Value<int> createdAt;
  final Value<int> updatedAt;
  final Value<int?> lastOpenedAt;
  final Value<String?> metadata;
  final Value<int> rowid;
  const ProjectTableCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.description = const Value.absent(),
    this.icon = const Value.absent(),
    this.color = const Value.absent(),
    this.banner = const Value.absent(),
    this.path = const Value.absent(),
    this.template = const Value.absent(),
    this.version = const Value.absent(),
    this.schemaVersion = const Value.absent(),
    this.documentCount = const Value.absent(),
    this.graphNodeCount = const Value.absent(),
    this.chatCount = const Value.absent(),
    this.taskCount = const Value.absent(),
    this.attachmentCount = const Value.absent(),
    this.isFavorite = const Value.absent(),
    this.isArchived = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.lastOpenedAt = const Value.absent(),
    this.metadata = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  ProjectTableCompanion.insert({
    required String id,
    required String name,
    this.description = const Value.absent(),
    this.icon = const Value.absent(),
    this.color = const Value.absent(),
    this.banner = const Value.absent(),
    required String path,
    this.template = const Value.absent(),
    this.version = const Value.absent(),
    this.schemaVersion = const Value.absent(),
    this.documentCount = const Value.absent(),
    this.graphNodeCount = const Value.absent(),
    this.chatCount = const Value.absent(),
    this.taskCount = const Value.absent(),
    this.attachmentCount = const Value.absent(),
    this.isFavorite = const Value.absent(),
    this.isArchived = const Value.absent(),
    required int createdAt,
    required int updatedAt,
    this.lastOpenedAt = const Value.absent(),
    this.metadata = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       name = Value(name),
       path = Value(path),
       createdAt = Value(createdAt),
       updatedAt = Value(updatedAt);
  static Insertable<Project> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<String>? description,
    Expression<String>? icon,
    Expression<int>? color,
    Expression<String>? banner,
    Expression<String>? path,
    Expression<String>? template,
    Expression<String>? version,
    Expression<int>? schemaVersion,
    Expression<int>? documentCount,
    Expression<int>? graphNodeCount,
    Expression<int>? chatCount,
    Expression<int>? taskCount,
    Expression<int>? attachmentCount,
    Expression<int>? isFavorite,
    Expression<int>? isArchived,
    Expression<int>? createdAt,
    Expression<int>? updatedAt,
    Expression<int>? lastOpenedAt,
    Expression<String>? metadata,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (description != null) 'description': description,
      if (icon != null) 'icon': icon,
      if (color != null) 'color': color,
      if (banner != null) 'banner': banner,
      if (path != null) 'path': path,
      if (template != null) 'template': template,
      if (version != null) 'version': version,
      if (schemaVersion != null) 'schema_version': schemaVersion,
      if (documentCount != null) 'document_count': documentCount,
      if (graphNodeCount != null) 'graph_node_count': graphNodeCount,
      if (chatCount != null) 'chat_count': chatCount,
      if (taskCount != null) 'task_count': taskCount,
      if (attachmentCount != null) 'attachment_count': attachmentCount,
      if (isFavorite != null) 'is_favorite': isFavorite,
      if (isArchived != null) 'is_archived': isArchived,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (lastOpenedAt != null) 'last_opened_at': lastOpenedAt,
      if (metadata != null) 'metadata': metadata,
      if (rowid != null) 'rowid': rowid,
    });
  }

  ProjectTableCompanion copyWith({
    Value<String>? id,
    Value<String>? name,
    Value<String?>? description,
    Value<String?>? icon,
    Value<int?>? color,
    Value<String?>? banner,
    Value<String>? path,
    Value<String>? template,
    Value<String>? version,
    Value<int>? schemaVersion,
    Value<int>? documentCount,
    Value<int>? graphNodeCount,
    Value<int>? chatCount,
    Value<int>? taskCount,
    Value<int>? attachmentCount,
    Value<int>? isFavorite,
    Value<int>? isArchived,
    Value<int>? createdAt,
    Value<int>? updatedAt,
    Value<int?>? lastOpenedAt,
    Value<String?>? metadata,
    Value<int>? rowid,
  }) {
    return ProjectTableCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      icon: icon ?? this.icon,
      color: color ?? this.color,
      banner: banner ?? this.banner,
      path: path ?? this.path,
      template: template ?? this.template,
      version: version ?? this.version,
      schemaVersion: schemaVersion ?? this.schemaVersion,
      documentCount: documentCount ?? this.documentCount,
      graphNodeCount: graphNodeCount ?? this.graphNodeCount,
      chatCount: chatCount ?? this.chatCount,
      taskCount: taskCount ?? this.taskCount,
      attachmentCount: attachmentCount ?? this.attachmentCount,
      isFavorite: isFavorite ?? this.isFavorite,
      isArchived: isArchived ?? this.isArchived,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastOpenedAt: lastOpenedAt ?? this.lastOpenedAt,
      metadata: metadata ?? this.metadata,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (description.present) {
      map['description'] = Variable<String>(description.value);
    }
    if (icon.present) {
      map['icon'] = Variable<String>(icon.value);
    }
    if (color.present) {
      map['color'] = Variable<int>(color.value);
    }
    if (banner.present) {
      map['banner'] = Variable<String>(banner.value);
    }
    if (path.present) {
      map['path'] = Variable<String>(path.value);
    }
    if (template.present) {
      map['template'] = Variable<String>(template.value);
    }
    if (version.present) {
      map['version'] = Variable<String>(version.value);
    }
    if (schemaVersion.present) {
      map['schema_version'] = Variable<int>(schemaVersion.value);
    }
    if (documentCount.present) {
      map['document_count'] = Variable<int>(documentCount.value);
    }
    if (graphNodeCount.present) {
      map['graph_node_count'] = Variable<int>(graphNodeCount.value);
    }
    if (chatCount.present) {
      map['chat_count'] = Variable<int>(chatCount.value);
    }
    if (taskCount.present) {
      map['task_count'] = Variable<int>(taskCount.value);
    }
    if (attachmentCount.present) {
      map['attachment_count'] = Variable<int>(attachmentCount.value);
    }
    if (isFavorite.present) {
      map['is_favorite'] = Variable<int>(isFavorite.value);
    }
    if (isArchived.present) {
      map['is_archived'] = Variable<int>(isArchived.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (lastOpenedAt.present) {
      map['last_opened_at'] = Variable<int>(lastOpenedAt.value);
    }
    if (metadata.present) {
      map['metadata'] = Variable<String>(metadata.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ProjectTableCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('description: $description, ')
          ..write('icon: $icon, ')
          ..write('color: $color, ')
          ..write('banner: $banner, ')
          ..write('path: $path, ')
          ..write('template: $template, ')
          ..write('version: $version, ')
          ..write('schemaVersion: $schemaVersion, ')
          ..write('documentCount: $documentCount, ')
          ..write('graphNodeCount: $graphNodeCount, ')
          ..write('chatCount: $chatCount, ')
          ..write('taskCount: $taskCount, ')
          ..write('attachmentCount: $attachmentCount, ')
          ..write('isFavorite: $isFavorite, ')
          ..write('isArchived: $isArchived, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastOpenedAt: $lastOpenedAt, ')
          ..write('metadata: $metadata, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $ProjectSettingsTableTable extends ProjectSettingsTable
    with TableInfo<$ProjectSettingsTableTable, ProjectSetting> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ProjectSettingsTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _projectIdMeta = const VerificationMeta(
    'projectId',
  );
  @override
  late final GeneratedColumn<String> projectId = GeneratedColumn<String>(
    'project_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES projects (id)',
    ),
  );
  static const VerificationMeta _keyMeta = const VerificationMeta('key');
  @override
  late final GeneratedColumn<String> key = GeneratedColumn<String>(
    'key',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _valueMeta = const VerificationMeta('value');
  @override
  late final GeneratedColumn<String> value = GeneratedColumn<String>(
    'value',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [projectId, key, value];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'project_settings';
  @override
  VerificationContext validateIntegrity(
    Insertable<ProjectSetting> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('project_id')) {
      context.handle(
        _projectIdMeta,
        projectId.isAcceptableOrUnknown(data['project_id']!, _projectIdMeta),
      );
    } else if (isInserting) {
      context.missing(_projectIdMeta);
    }
    if (data.containsKey('key')) {
      context.handle(
        _keyMeta,
        key.isAcceptableOrUnknown(data['key']!, _keyMeta),
      );
    } else if (isInserting) {
      context.missing(_keyMeta);
    }
    if (data.containsKey('value')) {
      context.handle(
        _valueMeta,
        value.isAcceptableOrUnknown(data['value']!, _valueMeta),
      );
    } else if (isInserting) {
      context.missing(_valueMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {projectId, key};
  @override
  ProjectSetting map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ProjectSetting(
      projectId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}project_id'],
      )!,
      key: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}key'],
      )!,
      value: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}value'],
      )!,
    );
  }

  @override
  $ProjectSettingsTableTable createAlias(String alias) {
    return $ProjectSettingsTableTable(attachedDatabase, alias);
  }
}

class ProjectSetting extends DataClass implements Insertable<ProjectSetting> {
  final String projectId;
  final String key;
  final String value;
  const ProjectSetting({
    required this.projectId,
    required this.key,
    required this.value,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['project_id'] = Variable<String>(projectId);
    map['key'] = Variable<String>(key);
    map['value'] = Variable<String>(value);
    return map;
  }

  ProjectSettingsTableCompanion toCompanion(bool nullToAbsent) {
    return ProjectSettingsTableCompanion(
      projectId: Value(projectId),
      key: Value(key),
      value: Value(value),
    );
  }

  factory ProjectSetting.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ProjectSetting(
      projectId: serializer.fromJson<String>(json['projectId']),
      key: serializer.fromJson<String>(json['key']),
      value: serializer.fromJson<String>(json['value']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'projectId': serializer.toJson<String>(projectId),
      'key': serializer.toJson<String>(key),
      'value': serializer.toJson<String>(value),
    };
  }

  ProjectSetting copyWith({String? projectId, String? key, String? value}) =>
      ProjectSetting(
        projectId: projectId ?? this.projectId,
        key: key ?? this.key,
        value: value ?? this.value,
      );
  ProjectSetting copyWithCompanion(ProjectSettingsTableCompanion data) {
    return ProjectSetting(
      projectId: data.projectId.present ? data.projectId.value : this.projectId,
      key: data.key.present ? data.key.value : this.key,
      value: data.value.present ? data.value.value : this.value,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ProjectSetting(')
          ..write('projectId: $projectId, ')
          ..write('key: $key, ')
          ..write('value: $value')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(projectId, key, value);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ProjectSetting &&
          other.projectId == this.projectId &&
          other.key == this.key &&
          other.value == this.value);
}

class ProjectSettingsTableCompanion extends UpdateCompanion<ProjectSetting> {
  final Value<String> projectId;
  final Value<String> key;
  final Value<String> value;
  final Value<int> rowid;
  const ProjectSettingsTableCompanion({
    this.projectId = const Value.absent(),
    this.key = const Value.absent(),
    this.value = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  ProjectSettingsTableCompanion.insert({
    required String projectId,
    required String key,
    required String value,
    this.rowid = const Value.absent(),
  }) : projectId = Value(projectId),
       key = Value(key),
       value = Value(value);
  static Insertable<ProjectSetting> custom({
    Expression<String>? projectId,
    Expression<String>? key,
    Expression<String>? value,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (projectId != null) 'project_id': projectId,
      if (key != null) 'key': key,
      if (value != null) 'value': value,
      if (rowid != null) 'rowid': rowid,
    });
  }

  ProjectSettingsTableCompanion copyWith({
    Value<String>? projectId,
    Value<String>? key,
    Value<String>? value,
    Value<int>? rowid,
  }) {
    return ProjectSettingsTableCompanion(
      projectId: projectId ?? this.projectId,
      key: key ?? this.key,
      value: value ?? this.value,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (projectId.present) {
      map['project_id'] = Variable<String>(projectId.value);
    }
    if (key.present) {
      map['key'] = Variable<String>(key.value);
    }
    if (value.present) {
      map['value'] = Variable<String>(value.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ProjectSettingsTableCompanion(')
          ..write('projectId: $projectId, ')
          ..write('key: $key, ')
          ..write('value: $value, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$BrainDatabase extends GeneratedDatabase {
  _$BrainDatabase(QueryExecutor e) : super(e);
  $BrainDatabaseManager get managers => $BrainDatabaseManager(this);
  late final $ProjectTableTable projectTable = $ProjectTableTable(this);
  late final $ProjectSettingsTableTable projectSettingsTable =
      $ProjectSettingsTableTable(this);
  late final ProjectDao projectDao = ProjectDao(this as BrainDatabase);
  late final ProjectSettingsDao projectSettingsDao = ProjectSettingsDao(
    this as BrainDatabase,
  );
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    projectTable,
    projectSettingsTable,
  ];
}

typedef $$ProjectTableTableCreateCompanionBuilder =
    ProjectTableCompanion Function({
      required String id,
      required String name,
      Value<String?> description,
      Value<String?> icon,
      Value<int?> color,
      Value<String?> banner,
      required String path,
      Value<String> template,
      Value<String> version,
      Value<int> schemaVersion,
      Value<int> documentCount,
      Value<int> graphNodeCount,
      Value<int> chatCount,
      Value<int> taskCount,
      Value<int> attachmentCount,
      Value<int> isFavorite,
      Value<int> isArchived,
      required int createdAt,
      required int updatedAt,
      Value<int?> lastOpenedAt,
      Value<String?> metadata,
      Value<int> rowid,
    });
typedef $$ProjectTableTableUpdateCompanionBuilder =
    ProjectTableCompanion Function({
      Value<String> id,
      Value<String> name,
      Value<String?> description,
      Value<String?> icon,
      Value<int?> color,
      Value<String?> banner,
      Value<String> path,
      Value<String> template,
      Value<String> version,
      Value<int> schemaVersion,
      Value<int> documentCount,
      Value<int> graphNodeCount,
      Value<int> chatCount,
      Value<int> taskCount,
      Value<int> attachmentCount,
      Value<int> isFavorite,
      Value<int> isArchived,
      Value<int> createdAt,
      Value<int> updatedAt,
      Value<int?> lastOpenedAt,
      Value<String?> metadata,
      Value<int> rowid,
    });

final class $$ProjectTableTableReferences
    extends BaseReferences<_$BrainDatabase, $ProjectTableTable, Project> {
  $$ProjectTableTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$ProjectSettingsTableTable, List<ProjectSetting>>
  _projectSettingsTableRefsTable(_$BrainDatabase db) =>
      MultiTypedResultKey.fromTable(
        db.projectSettingsTable,
        aliasName: 'projects__id__project_settings__project_id',
      );

  $$ProjectSettingsTableTableProcessedTableManager
  get projectSettingsTableRefs {
    final manager = $$ProjectSettingsTableTableTableManager(
      $_db,
      $_db.projectSettingsTable,
    ).filter((f) => f.projectId.id.sqlEquals($_itemColumn<String>('id')!));

    final cache = $_typedResult.readTableOrNull(
      _projectSettingsTableRefsTable($_db),
    );
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$ProjectTableTableFilterComposer
    extends Composer<_$BrainDatabase, $ProjectTableTable> {
  $$ProjectTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get icon => $composableBuilder(
    column: $table.icon,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get color => $composableBuilder(
    column: $table.color,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get banner => $composableBuilder(
    column: $table.banner,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get path => $composableBuilder(
    column: $table.path,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get template => $composableBuilder(
    column: $table.template,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get version => $composableBuilder(
    column: $table.version,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get schemaVersion => $composableBuilder(
    column: $table.schemaVersion,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get documentCount => $composableBuilder(
    column: $table.documentCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get graphNodeCount => $composableBuilder(
    column: $table.graphNodeCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get chatCount => $composableBuilder(
    column: $table.chatCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get taskCount => $composableBuilder(
    column: $table.taskCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get attachmentCount => $composableBuilder(
    column: $table.attachmentCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get isFavorite => $composableBuilder(
    column: $table.isFavorite,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get isArchived => $composableBuilder(
    column: $table.isArchived,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get lastOpenedAt => $composableBuilder(
    column: $table.lastOpenedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get metadata => $composableBuilder(
    column: $table.metadata,
    builder: (column) => ColumnFilters(column),
  );

  Expression<bool> projectSettingsTableRefs(
    Expression<bool> Function($$ProjectSettingsTableTableFilterComposer f) f,
  ) {
    final $$ProjectSettingsTableTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.projectSettingsTable,
      getReferencedColumn: (t) => t.projectId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ProjectSettingsTableTableFilterComposer(
            $db: $db,
            $table: $db.projectSettingsTable,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$ProjectTableTableOrderingComposer
    extends Composer<_$BrainDatabase, $ProjectTableTable> {
  $$ProjectTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get icon => $composableBuilder(
    column: $table.icon,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get color => $composableBuilder(
    column: $table.color,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get banner => $composableBuilder(
    column: $table.banner,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get path => $composableBuilder(
    column: $table.path,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get template => $composableBuilder(
    column: $table.template,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get version => $composableBuilder(
    column: $table.version,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get schemaVersion => $composableBuilder(
    column: $table.schemaVersion,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get documentCount => $composableBuilder(
    column: $table.documentCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get graphNodeCount => $composableBuilder(
    column: $table.graphNodeCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get chatCount => $composableBuilder(
    column: $table.chatCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get taskCount => $composableBuilder(
    column: $table.taskCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get attachmentCount => $composableBuilder(
    column: $table.attachmentCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get isFavorite => $composableBuilder(
    column: $table.isFavorite,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get isArchived => $composableBuilder(
    column: $table.isArchived,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get lastOpenedAt => $composableBuilder(
    column: $table.lastOpenedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get metadata => $composableBuilder(
    column: $table.metadata,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$ProjectTableTableAnnotationComposer
    extends Composer<_$BrainDatabase, $ProjectTableTable> {
  $$ProjectTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => column,
  );

  GeneratedColumn<String> get icon =>
      $composableBuilder(column: $table.icon, builder: (column) => column);

  GeneratedColumn<int> get color =>
      $composableBuilder(column: $table.color, builder: (column) => column);

  GeneratedColumn<String> get banner =>
      $composableBuilder(column: $table.banner, builder: (column) => column);

  GeneratedColumn<String> get path =>
      $composableBuilder(column: $table.path, builder: (column) => column);

  GeneratedColumn<String> get template =>
      $composableBuilder(column: $table.template, builder: (column) => column);

  GeneratedColumn<String> get version =>
      $composableBuilder(column: $table.version, builder: (column) => column);

  GeneratedColumn<int> get schemaVersion => $composableBuilder(
    column: $table.schemaVersion,
    builder: (column) => column,
  );

  GeneratedColumn<int> get documentCount => $composableBuilder(
    column: $table.documentCount,
    builder: (column) => column,
  );

  GeneratedColumn<int> get graphNodeCount => $composableBuilder(
    column: $table.graphNodeCount,
    builder: (column) => column,
  );

  GeneratedColumn<int> get chatCount =>
      $composableBuilder(column: $table.chatCount, builder: (column) => column);

  GeneratedColumn<int> get taskCount =>
      $composableBuilder(column: $table.taskCount, builder: (column) => column);

  GeneratedColumn<int> get attachmentCount => $composableBuilder(
    column: $table.attachmentCount,
    builder: (column) => column,
  );

  GeneratedColumn<int> get isFavorite => $composableBuilder(
    column: $table.isFavorite,
    builder: (column) => column,
  );

  GeneratedColumn<int> get isArchived => $composableBuilder(
    column: $table.isArchived,
    builder: (column) => column,
  );

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<int> get lastOpenedAt => $composableBuilder(
    column: $table.lastOpenedAt,
    builder: (column) => column,
  );

  GeneratedColumn<String> get metadata =>
      $composableBuilder(column: $table.metadata, builder: (column) => column);

  Expression<T> projectSettingsTableRefs<T extends Object>(
    Expression<T> Function($$ProjectSettingsTableTableAnnotationComposer a) f,
  ) {
    final $$ProjectSettingsTableTableAnnotationComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.id,
          referencedTable: $db.projectSettingsTable,
          getReferencedColumn: (t) => t.projectId,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ProjectSettingsTableTableAnnotationComposer(
                $db: $db,
                $table: $db.projectSettingsTable,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return f(composer);
  }
}

class $$ProjectTableTableTableManager
    extends
        RootTableManager<
          _$BrainDatabase,
          $ProjectTableTable,
          Project,
          $$ProjectTableTableFilterComposer,
          $$ProjectTableTableOrderingComposer,
          $$ProjectTableTableAnnotationComposer,
          $$ProjectTableTableCreateCompanionBuilder,
          $$ProjectTableTableUpdateCompanionBuilder,
          (Project, $$ProjectTableTableReferences),
          Project,
          PrefetchHooks Function({bool projectSettingsTableRefs})
        > {
  $$ProjectTableTableTableManager(_$BrainDatabase db, $ProjectTableTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ProjectTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ProjectTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ProjectTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String?> description = const Value.absent(),
                Value<String?> icon = const Value.absent(),
                Value<int?> color = const Value.absent(),
                Value<String?> banner = const Value.absent(),
                Value<String> path = const Value.absent(),
                Value<String> template = const Value.absent(),
                Value<String> version = const Value.absent(),
                Value<int> schemaVersion = const Value.absent(),
                Value<int> documentCount = const Value.absent(),
                Value<int> graphNodeCount = const Value.absent(),
                Value<int> chatCount = const Value.absent(),
                Value<int> taskCount = const Value.absent(),
                Value<int> attachmentCount = const Value.absent(),
                Value<int> isFavorite = const Value.absent(),
                Value<int> isArchived = const Value.absent(),
                Value<int> createdAt = const Value.absent(),
                Value<int> updatedAt = const Value.absent(),
                Value<int?> lastOpenedAt = const Value.absent(),
                Value<String?> metadata = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => ProjectTableCompanion(
                id: id,
                name: name,
                description: description,
                icon: icon,
                color: color,
                banner: banner,
                path: path,
                template: template,
                version: version,
                schemaVersion: schemaVersion,
                documentCount: documentCount,
                graphNodeCount: graphNodeCount,
                chatCount: chatCount,
                taskCount: taskCount,
                attachmentCount: attachmentCount,
                isFavorite: isFavorite,
                isArchived: isArchived,
                createdAt: createdAt,
                updatedAt: updatedAt,
                lastOpenedAt: lastOpenedAt,
                metadata: metadata,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String name,
                Value<String?> description = const Value.absent(),
                Value<String?> icon = const Value.absent(),
                Value<int?> color = const Value.absent(),
                Value<String?> banner = const Value.absent(),
                required String path,
                Value<String> template = const Value.absent(),
                Value<String> version = const Value.absent(),
                Value<int> schemaVersion = const Value.absent(),
                Value<int> documentCount = const Value.absent(),
                Value<int> graphNodeCount = const Value.absent(),
                Value<int> chatCount = const Value.absent(),
                Value<int> taskCount = const Value.absent(),
                Value<int> attachmentCount = const Value.absent(),
                Value<int> isFavorite = const Value.absent(),
                Value<int> isArchived = const Value.absent(),
                required int createdAt,
                required int updatedAt,
                Value<int?> lastOpenedAt = const Value.absent(),
                Value<String?> metadata = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => ProjectTableCompanion.insert(
                id: id,
                name: name,
                description: description,
                icon: icon,
                color: color,
                banner: banner,
                path: path,
                template: template,
                version: version,
                schemaVersion: schemaVersion,
                documentCount: documentCount,
                graphNodeCount: graphNodeCount,
                chatCount: chatCount,
                taskCount: taskCount,
                attachmentCount: attachmentCount,
                isFavorite: isFavorite,
                isArchived: isArchived,
                createdAt: createdAt,
                updatedAt: updatedAt,
                lastOpenedAt: lastOpenedAt,
                metadata: metadata,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$ProjectTableTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({projectSettingsTableRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (projectSettingsTableRefs) db.projectSettingsTable,
              ],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (projectSettingsTableRefs)
                    await $_getPrefetchedData<
                      Project,
                      $ProjectTableTable,
                      ProjectSetting
                    >(
                      currentTable: table,
                      referencedTable: $$ProjectTableTableReferences
                          ._projectSettingsTableRefsTable(db),
                      managerFromTypedResult: (p0) =>
                          $$ProjectTableTableReferences(
                            db,
                            table,
                            p0,
                          ).projectSettingsTableRefs,
                      referencedItemsForCurrentItem: (item, referencedItems) =>
                          referencedItems.where((e) => e.projectId == item.id),
                      typedResults: items,
                    ),
                ];
              },
            );
          },
        ),
      );
}

typedef $$ProjectTableTableProcessedTableManager =
    ProcessedTableManager<
      _$BrainDatabase,
      $ProjectTableTable,
      Project,
      $$ProjectTableTableFilterComposer,
      $$ProjectTableTableOrderingComposer,
      $$ProjectTableTableAnnotationComposer,
      $$ProjectTableTableCreateCompanionBuilder,
      $$ProjectTableTableUpdateCompanionBuilder,
      (Project, $$ProjectTableTableReferences),
      Project,
      PrefetchHooks Function({bool projectSettingsTableRefs})
    >;
typedef $$ProjectSettingsTableTableCreateCompanionBuilder =
    ProjectSettingsTableCompanion Function({
      required String projectId,
      required String key,
      required String value,
      Value<int> rowid,
    });
typedef $$ProjectSettingsTableTableUpdateCompanionBuilder =
    ProjectSettingsTableCompanion Function({
      Value<String> projectId,
      Value<String> key,
      Value<String> value,
      Value<int> rowid,
    });

final class $$ProjectSettingsTableTableReferences
    extends
        BaseReferences<
          _$BrainDatabase,
          $ProjectSettingsTableTable,
          ProjectSetting
        > {
  $$ProjectSettingsTableTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static $ProjectTableTable _projectIdTable(_$BrainDatabase db) =>
      db.projectTable.createAlias('project_settings__project_id__projects__id');

  $$ProjectTableTableProcessedTableManager get projectId {
    final $_column = $_itemColumn<String>('project_id')!;

    final manager = $$ProjectTableTableTableManager(
      $_db,
      $_db.projectTable,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_projectIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }
}

class $$ProjectSettingsTableTableFilterComposer
    extends Composer<_$BrainDatabase, $ProjectSettingsTableTable> {
  $$ProjectSettingsTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get key => $composableBuilder(
    column: $table.key,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get value => $composableBuilder(
    column: $table.value,
    builder: (column) => ColumnFilters(column),
  );

  $$ProjectTableTableFilterComposer get projectId {
    final $$ProjectTableTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.projectId,
      referencedTable: $db.projectTable,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ProjectTableTableFilterComposer(
            $db: $db,
            $table: $db.projectTable,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$ProjectSettingsTableTableOrderingComposer
    extends Composer<_$BrainDatabase, $ProjectSettingsTableTable> {
  $$ProjectSettingsTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get key => $composableBuilder(
    column: $table.key,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get value => $composableBuilder(
    column: $table.value,
    builder: (column) => ColumnOrderings(column),
  );

  $$ProjectTableTableOrderingComposer get projectId {
    final $$ProjectTableTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.projectId,
      referencedTable: $db.projectTable,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ProjectTableTableOrderingComposer(
            $db: $db,
            $table: $db.projectTable,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$ProjectSettingsTableTableAnnotationComposer
    extends Composer<_$BrainDatabase, $ProjectSettingsTableTable> {
  $$ProjectSettingsTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => column);

  GeneratedColumn<String> get value =>
      $composableBuilder(column: $table.value, builder: (column) => column);

  $$ProjectTableTableAnnotationComposer get projectId {
    final $$ProjectTableTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.projectId,
      referencedTable: $db.projectTable,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ProjectTableTableAnnotationComposer(
            $db: $db,
            $table: $db.projectTable,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$ProjectSettingsTableTableTableManager
    extends
        RootTableManager<
          _$BrainDatabase,
          $ProjectSettingsTableTable,
          ProjectSetting,
          $$ProjectSettingsTableTableFilterComposer,
          $$ProjectSettingsTableTableOrderingComposer,
          $$ProjectSettingsTableTableAnnotationComposer,
          $$ProjectSettingsTableTableCreateCompanionBuilder,
          $$ProjectSettingsTableTableUpdateCompanionBuilder,
          (ProjectSetting, $$ProjectSettingsTableTableReferences),
          ProjectSetting,
          PrefetchHooks Function({bool projectId})
        > {
  $$ProjectSettingsTableTableTableManager(
    _$BrainDatabase db,
    $ProjectSettingsTableTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ProjectSettingsTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ProjectSettingsTableTableOrderingComposer(
                $db: db,
                $table: table,
              ),
          createComputedFieldComposer: () =>
              $$ProjectSettingsTableTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> projectId = const Value.absent(),
                Value<String> key = const Value.absent(),
                Value<String> value = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => ProjectSettingsTableCompanion(
                projectId: projectId,
                key: key,
                value: value,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String projectId,
                required String key,
                required String value,
                Value<int> rowid = const Value.absent(),
              }) => ProjectSettingsTableCompanion.insert(
                projectId: projectId,
                key: key,
                value: value,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$ProjectSettingsTableTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({projectId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins:
                  <
                    T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic
                    >
                  >(state) {
                    if (projectId) {
                      state =
                          state.withJoin(
                                currentTable: table,
                                currentColumn: table.projectId,
                                referencedTable:
                                    $$ProjectSettingsTableTableReferences
                                        ._projectIdTable(db),
                                referencedColumn:
                                    $$ProjectSettingsTableTableReferences
                                        ._projectIdTable(db)
                                        .id,
                              )
                              as T;
                    }

                    return state;
                  },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ),
      );
}

typedef $$ProjectSettingsTableTableProcessedTableManager =
    ProcessedTableManager<
      _$BrainDatabase,
      $ProjectSettingsTableTable,
      ProjectSetting,
      $$ProjectSettingsTableTableFilterComposer,
      $$ProjectSettingsTableTableOrderingComposer,
      $$ProjectSettingsTableTableAnnotationComposer,
      $$ProjectSettingsTableTableCreateCompanionBuilder,
      $$ProjectSettingsTableTableUpdateCompanionBuilder,
      (ProjectSetting, $$ProjectSettingsTableTableReferences),
      ProjectSetting,
      PrefetchHooks Function({bool projectId})
    >;

class $BrainDatabaseManager {
  final _$BrainDatabase _db;
  $BrainDatabaseManager(this._db);
  $$ProjectTableTableTableManager get projectTable =>
      $$ProjectTableTableTableManager(_db, _db.projectTable);
  $$ProjectSettingsTableTableTableManager get projectSettingsTable =>
      $$ProjectSettingsTableTableTableManager(_db, _db.projectSettingsTable);
}
