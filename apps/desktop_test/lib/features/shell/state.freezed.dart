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
mixin _$ShellState {

 int get selectedIndex; SidebarControl get sidebarControl; bool get isHovered; Project? get selectedProject; List<Project> get projects;
/// Create a copy of ShellState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ShellStateCopyWith<ShellState> get copyWith => _$ShellStateCopyWithImpl<ShellState>(this as ShellState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ShellState&&(identical(other.selectedIndex, selectedIndex) || other.selectedIndex == selectedIndex)&&(identical(other.sidebarControl, sidebarControl) || other.sidebarControl == sidebarControl)&&(identical(other.isHovered, isHovered) || other.isHovered == isHovered)&&(identical(other.selectedProject, selectedProject) || other.selectedProject == selectedProject)&&const DeepCollectionEquality().equals(other.projects, projects));
}


@override
int get hashCode => Object.hash(runtimeType,selectedIndex,sidebarControl,isHovered,selectedProject,const DeepCollectionEquality().hash(projects));

@override
String toString() {
  return 'ShellState(selectedIndex: $selectedIndex, sidebarControl: $sidebarControl, isHovered: $isHovered, selectedProject: $selectedProject, projects: $projects)';
}


}

/// @nodoc
abstract mixin class $ShellStateCopyWith<$Res>  {
  factory $ShellStateCopyWith(ShellState value, $Res Function(ShellState) _then) = _$ShellStateCopyWithImpl;
@useResult
$Res call({
 int selectedIndex, SidebarControl sidebarControl, bool isHovered, Project? selectedProject, List<Project> projects
});




}
/// @nodoc
class _$ShellStateCopyWithImpl<$Res>
    implements $ShellStateCopyWith<$Res> {
  _$ShellStateCopyWithImpl(this._self, this._then);

  final ShellState _self;
  final $Res Function(ShellState) _then;

/// Create a copy of ShellState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? selectedIndex = null,Object? sidebarControl = null,Object? isHovered = null,Object? selectedProject = freezed,Object? projects = null,}) {
  return _then(ShellState(
selectedIndex: null == selectedIndex ? _self.selectedIndex : selectedIndex // ignore: cast_nullable_to_non_nullable
as int,sidebarControl: null == sidebarControl ? _self.sidebarControl : sidebarControl // ignore: cast_nullable_to_non_nullable
as SidebarControl,isHovered: null == isHovered ? _self.isHovered : isHovered // ignore: cast_nullable_to_non_nullable
as bool,selectedProject: freezed == selectedProject ? _self.selectedProject : selectedProject // ignore: cast_nullable_to_non_nullable
as Project?,projects: null == projects ? _self.projects : projects // ignore: cast_nullable_to_non_nullable
as List<Project>,
  ));
}

}


/// Adds pattern-matching-related methods to [ShellState].
extension ShellStatePatterns on ShellState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ShellState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ShellState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ShellState value)  $default,){
final _that = this;
switch (_that) {
case _ShellState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ShellState value)?  $default,){
final _that = this;
switch (_that) {
case _ShellState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int selectedIndex,  SidebarControl sidebarControl,  bool isHovered,  Project? selectedProject,  List<Project> projects)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ShellState() when $default != null:
return $default(_that.selectedIndex,_that.sidebarControl,_that.isHovered,_that.selectedProject,_that.projects);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int selectedIndex,  SidebarControl sidebarControl,  bool isHovered,  Project? selectedProject,  List<Project> projects)  $default,) {final _that = this;
switch (_that) {
case _ShellState():
return $default(_that.selectedIndex,_that.sidebarControl,_that.isHovered,_that.selectedProject,_that.projects);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int selectedIndex,  SidebarControl sidebarControl,  bool isHovered,  Project? selectedProject,  List<Project> projects)?  $default,) {final _that = this;
switch (_that) {
case _ShellState() when $default != null:
return $default(_that.selectedIndex,_that.sidebarControl,_that.isHovered,_that.selectedProject,_that.projects);case _:
  return null;

}
}

}

/// @nodoc


class _ShellState implements ShellState {
  const _ShellState({this.selectedIndex = 0, this.sidebarControl = SidebarControl.expanded, this.isHovered = false, this.selectedProject,  List<Project> projects = const []}): _projects = projects;
  

@override@JsonKey() final  int selectedIndex;
@override@JsonKey() final  SidebarControl sidebarControl;
@override@JsonKey() final  bool isHovered;
@override final  Project? selectedProject;
 final  List<Project> _projects;
@override@JsonKey() List<Project> get projects {
  if (_projects is EqualUnmodifiableListView) return _projects;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_projects);
}


/// Create a copy of ShellState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ShellStateCopyWith<_ShellState> get copyWith => __$ShellStateCopyWithImpl<_ShellState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ShellState&&(identical(other.selectedIndex, selectedIndex) || other.selectedIndex == selectedIndex)&&(identical(other.sidebarControl, sidebarControl) || other.sidebarControl == sidebarControl)&&(identical(other.isHovered, isHovered) || other.isHovered == isHovered)&&(identical(other.selectedProject, selectedProject) || other.selectedProject == selectedProject)&&const DeepCollectionEquality().equals(other._projects, _projects));
}


@override
int get hashCode => Object.hash(runtimeType,selectedIndex,sidebarControl,isHovered,selectedProject,const DeepCollectionEquality().hash(_projects));

@override
String toString() {
  return 'ShellState(selectedIndex: $selectedIndex, sidebarControl: $sidebarControl, isHovered: $isHovered, selectedProject: $selectedProject, projects: $projects)';
}


}

/// @nodoc
abstract mixin class _$ShellStateCopyWith<$Res> implements $ShellStateCopyWith<$Res> {
  factory _$ShellStateCopyWith(_ShellState value, $Res Function(_ShellState) _then) = __$ShellStateCopyWithImpl;
@override @useResult
$Res call({
 int selectedIndex, SidebarControl sidebarControl, bool isHovered, Project? selectedProject, List<Project> projects
});




}
/// @nodoc
class __$ShellStateCopyWithImpl<$Res>
    implements _$ShellStateCopyWith<$Res> {
  __$ShellStateCopyWithImpl(this._self, this._then);

  final _ShellState _self;
  final $Res Function(_ShellState) _then;

/// Create a copy of ShellState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? selectedIndex = null,Object? sidebarControl = null,Object? isHovered = null,Object? selectedProject = freezed,Object? projects = null,}) {
  return _then(_ShellState(
selectedIndex: null == selectedIndex ? _self.selectedIndex : selectedIndex // ignore: cast_nullable_to_non_nullable
as int,sidebarControl: null == sidebarControl ? _self.sidebarControl : sidebarControl // ignore: cast_nullable_to_non_nullable
as SidebarControl,isHovered: null == isHovered ? _self.isHovered : isHovered // ignore: cast_nullable_to_non_nullable
as bool,selectedProject: freezed == selectedProject ? _self.selectedProject : selectedProject // ignore: cast_nullable_to_non_nullable
as Project?,projects: null == projects ? _self._projects : projects // ignore: cast_nullable_to_non_nullable
as List<Project>,
  ));
}


}

// dart format on
