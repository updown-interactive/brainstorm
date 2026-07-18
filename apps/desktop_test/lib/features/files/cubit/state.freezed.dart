// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$FilesState {

 bool get isLoading; List<FileSystemEntity> get nodes; Set<String> get expandedPaths; Map<String, String> get allNotes; Map<String, List<String>> get backlinks; String? get rootPath; String? get selectedPath; String? get error; String? get clipboardPath; ClipboardAction? get clipboardAction;
/// Create a copy of FilesState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FilesStateCopyWith<FilesState> get copyWith => _$FilesStateCopyWithImpl<FilesState>(this as FilesState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FilesState&&(identical(other.isLoading, isLoading) || other.isLoading == isLoading)&&const DeepCollectionEquality().equals(other.nodes, nodes)&&const DeepCollectionEquality().equals(other.expandedPaths, expandedPaths)&&const DeepCollectionEquality().equals(other.allNotes, allNotes)&&const DeepCollectionEquality().equals(other.backlinks, backlinks)&&(identical(other.rootPath, rootPath) || other.rootPath == rootPath)&&(identical(other.selectedPath, selectedPath) || other.selectedPath == selectedPath)&&(identical(other.error, error) || other.error == error)&&(identical(other.clipboardPath, clipboardPath) || other.clipboardPath == clipboardPath)&&(identical(other.clipboardAction, clipboardAction) || other.clipboardAction == clipboardAction));
}


@override
int get hashCode => Object.hash(runtimeType,isLoading,const DeepCollectionEquality().hash(nodes),const DeepCollectionEquality().hash(expandedPaths),const DeepCollectionEquality().hash(allNotes),const DeepCollectionEquality().hash(backlinks),rootPath,selectedPath,error,clipboardPath,clipboardAction);

@override
String toString() {
  return 'FilesState(isLoading: $isLoading, nodes: $nodes, expandedPaths: $expandedPaths, allNotes: $allNotes, backlinks: $backlinks, rootPath: $rootPath, selectedPath: $selectedPath, error: $error, clipboardPath: $clipboardPath, clipboardAction: $clipboardAction)';
}


}

/// @nodoc
abstract mixin class $FilesStateCopyWith<$Res>  {
  factory $FilesStateCopyWith(FilesState value, $Res Function(FilesState) _then) = _$FilesStateCopyWithImpl;
@useResult
$Res call({
 bool isLoading, List<FileSystemEntity> nodes, Set<String> expandedPaths, Map<String, String> allNotes, Map<String, List<String>> backlinks, String? rootPath, String? selectedPath, String? error, String? clipboardPath, ClipboardAction? clipboardAction
});




}
/// @nodoc
class _$FilesStateCopyWithImpl<$Res>
    implements $FilesStateCopyWith<$Res> {
  _$FilesStateCopyWithImpl(this._self, this._then);

  final FilesState _self;
  final $Res Function(FilesState) _then;

/// Create a copy of FilesState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? isLoading = null,Object? nodes = null,Object? expandedPaths = null,Object? allNotes = null,Object? backlinks = null,Object? rootPath = freezed,Object? selectedPath = freezed,Object? error = freezed,Object? clipboardPath = freezed,Object? clipboardAction = freezed,}) {
  return _then(FilesState(
isLoading: null == isLoading ? _self.isLoading : isLoading // ignore: cast_nullable_to_non_nullable
as bool,nodes: null == nodes ? _self.nodes : nodes // ignore: cast_nullable_to_non_nullable
as List<FileSystemEntity>,expandedPaths: null == expandedPaths ? _self.expandedPaths : expandedPaths // ignore: cast_nullable_to_non_nullable
as Set<String>,allNotes: null == allNotes ? _self.allNotes : allNotes // ignore: cast_nullable_to_non_nullable
as Map<String, String>,backlinks: null == backlinks ? _self.backlinks : backlinks // ignore: cast_nullable_to_non_nullable
as Map<String, List<String>>,rootPath: freezed == rootPath ? _self.rootPath : rootPath // ignore: cast_nullable_to_non_nullable
as String?,selectedPath: freezed == selectedPath ? _self.selectedPath : selectedPath // ignore: cast_nullable_to_non_nullable
as String?,error: freezed == error ? _self.error : error // ignore: cast_nullable_to_non_nullable
as String?,clipboardPath: freezed == clipboardPath ? _self.clipboardPath : clipboardPath // ignore: cast_nullable_to_non_nullable
as String?,clipboardAction: freezed == clipboardAction ? _self.clipboardAction : clipboardAction // ignore: cast_nullable_to_non_nullable
as ClipboardAction?,
  ));
}

}


/// Adds pattern-matching-related methods to [FilesState].
extension FilesStatePatterns on FilesState {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FilesState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FilesState() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FilesState value)  $default,){
final _that = this;
switch (_that) {
case _FilesState():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FilesState value)?  $default,){
final _that = this;
switch (_that) {
case _FilesState() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( bool isLoading,  List<FileSystemEntity> nodes,  Set<String> expandedPaths,  Map<String, String> allNotes,  Map<String, List<String>> backlinks,  String? rootPath,  String? selectedPath,  String? error,  String? clipboardPath,  ClipboardAction? clipboardAction)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FilesState() when $default != null:
return $default(_that.isLoading,_that.nodes,_that.expandedPaths,_that.allNotes,_that.backlinks,_that.rootPath,_that.selectedPath,_that.error,_that.clipboardPath,_that.clipboardAction);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( bool isLoading,  List<FileSystemEntity> nodes,  Set<String> expandedPaths,  Map<String, String> allNotes,  Map<String, List<String>> backlinks,  String? rootPath,  String? selectedPath,  String? error,  String? clipboardPath,  ClipboardAction? clipboardAction)  $default,) {final _that = this;
switch (_that) {
case _FilesState():
return $default(_that.isLoading,_that.nodes,_that.expandedPaths,_that.allNotes,_that.backlinks,_that.rootPath,_that.selectedPath,_that.error,_that.clipboardPath,_that.clipboardAction);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( bool isLoading,  List<FileSystemEntity> nodes,  Set<String> expandedPaths,  Map<String, String> allNotes,  Map<String, List<String>> backlinks,  String? rootPath,  String? selectedPath,  String? error,  String? clipboardPath,  ClipboardAction? clipboardAction)?  $default,) {final _that = this;
switch (_that) {
case _FilesState() when $default != null:
return $default(_that.isLoading,_that.nodes,_that.expandedPaths,_that.allNotes,_that.backlinks,_that.rootPath,_that.selectedPath,_that.error,_that.clipboardPath,_that.clipboardAction);case _:
  return null;

}
}

}

/// @nodoc


class _FilesState implements FilesState {
  const _FilesState({this.isLoading = false,  List<FileSystemEntity> nodes = const [],  Set<String> expandedPaths = const {},  Map<String, String> allNotes = const {},  Map<String, List<String>> backlinks = const {}, this.rootPath, this.selectedPath, this.error, this.clipboardPath, this.clipboardAction}): _nodes = nodes,_expandedPaths = expandedPaths,_allNotes = allNotes,_backlinks = backlinks;
  

@override@JsonKey() final  bool isLoading;
 final  List<FileSystemEntity> _nodes;
@override@JsonKey() List<FileSystemEntity> get nodes {
  if (_nodes is EqualUnmodifiableListView) return _nodes;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_nodes);
}

 final  Set<String> _expandedPaths;
@override@JsonKey() Set<String> get expandedPaths {
  if (_expandedPaths is EqualUnmodifiableSetView) return _expandedPaths;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableSetView(_expandedPaths);
}

 final  Map<String, String> _allNotes;
@override@JsonKey() Map<String, String> get allNotes {
  if (_allNotes is EqualUnmodifiableMapView) return _allNotes;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_allNotes);
}

 final  Map<String, List<String>> _backlinks;
@override@JsonKey() Map<String, List<String>> get backlinks {
  if (_backlinks is EqualUnmodifiableMapView) return _backlinks;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_backlinks);
}

@override final  String? rootPath;
@override final  String? selectedPath;
@override final  String? error;
@override final  String? clipboardPath;
@override final  ClipboardAction? clipboardAction;

/// Create a copy of FilesState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FilesStateCopyWith<_FilesState> get copyWith => __$FilesStateCopyWithImpl<_FilesState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _FilesState&&(identical(other.isLoading, isLoading) || other.isLoading == isLoading)&&const DeepCollectionEquality().equals(other._nodes, _nodes)&&const DeepCollectionEquality().equals(other._expandedPaths, _expandedPaths)&&const DeepCollectionEquality().equals(other._allNotes, _allNotes)&&const DeepCollectionEquality().equals(other._backlinks, _backlinks)&&(identical(other.rootPath, rootPath) || other.rootPath == rootPath)&&(identical(other.selectedPath, selectedPath) || other.selectedPath == selectedPath)&&(identical(other.error, error) || other.error == error)&&(identical(other.clipboardPath, clipboardPath) || other.clipboardPath == clipboardPath)&&(identical(other.clipboardAction, clipboardAction) || other.clipboardAction == clipboardAction));
}


@override
int get hashCode => Object.hash(runtimeType,isLoading,const DeepCollectionEquality().hash(_nodes),const DeepCollectionEquality().hash(_expandedPaths),const DeepCollectionEquality().hash(_allNotes),const DeepCollectionEquality().hash(_backlinks),rootPath,selectedPath,error,clipboardPath,clipboardAction);

@override
String toString() {
  return 'FilesState(isLoading: $isLoading, nodes: $nodes, expandedPaths: $expandedPaths, allNotes: $allNotes, backlinks: $backlinks, rootPath: $rootPath, selectedPath: $selectedPath, error: $error, clipboardPath: $clipboardPath, clipboardAction: $clipboardAction)';
}


}

/// @nodoc
abstract mixin class _$FilesStateCopyWith<$Res> implements $FilesStateCopyWith<$Res> {
  factory _$FilesStateCopyWith(_FilesState value, $Res Function(_FilesState) _then) = __$FilesStateCopyWithImpl;
@override @useResult
$Res call({
 bool isLoading, List<FileSystemEntity> nodes, Set<String> expandedPaths, Map<String, String> allNotes, Map<String, List<String>> backlinks, String? rootPath, String? selectedPath, String? error, String? clipboardPath, ClipboardAction? clipboardAction
});




}
/// @nodoc
class __$FilesStateCopyWithImpl<$Res>
    implements _$FilesStateCopyWith<$Res> {
  __$FilesStateCopyWithImpl(this._self, this._then);

  final _FilesState _self;
  final $Res Function(_FilesState) _then;

/// Create a copy of FilesState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? isLoading = null,Object? nodes = null,Object? expandedPaths = null,Object? allNotes = null,Object? backlinks = null,Object? rootPath = freezed,Object? selectedPath = freezed,Object? error = freezed,Object? clipboardPath = freezed,Object? clipboardAction = freezed,}) {
  return _then(_FilesState(
isLoading: null == isLoading ? _self.isLoading : isLoading // ignore: cast_nullable_to_non_nullable
as bool,nodes: null == nodes ? _self._nodes : nodes // ignore: cast_nullable_to_non_nullable
as List<FileSystemEntity>,expandedPaths: null == expandedPaths ? _self._expandedPaths : expandedPaths // ignore: cast_nullable_to_non_nullable
as Set<String>,allNotes: null == allNotes ? _self._allNotes : allNotes // ignore: cast_nullable_to_non_nullable
as Map<String, String>,backlinks: null == backlinks ? _self._backlinks : backlinks // ignore: cast_nullable_to_non_nullable
as Map<String, List<String>>,rootPath: freezed == rootPath ? _self.rootPath : rootPath // ignore: cast_nullable_to_non_nullable
as String?,selectedPath: freezed == selectedPath ? _self.selectedPath : selectedPath // ignore: cast_nullable_to_non_nullable
as String?,error: freezed == error ? _self.error : error // ignore: cast_nullable_to_non_nullable
as String?,clipboardPath: freezed == clipboardPath ? _self.clipboardPath : clipboardPath // ignore: cast_nullable_to_non_nullable
as String?,clipboardAction: freezed == clipboardAction ? _self.clipboardAction : clipboardAction // ignore: cast_nullable_to_non_nullable
as ClipboardAction?,
  ));
}


}

// dart format on
