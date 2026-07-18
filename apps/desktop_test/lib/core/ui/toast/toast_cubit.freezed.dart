// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'toast_cubit.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$ToastMessage {

 String get id; String get title; String? get message; Color? get color; IconData? get icon;
/// Create a copy of ToastMessage
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ToastMessageCopyWith<ToastMessage> get copyWith => _$ToastMessageCopyWithImpl<ToastMessage>(this as ToastMessage, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ToastMessage&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.message, message) || other.message == message)&&(identical(other.color, color) || other.color == color)&&(identical(other.icon, icon) || other.icon == icon));
}


@override
int get hashCode => Object.hash(runtimeType,id,title,message,color,icon);

@override
String toString() {
  return 'ToastMessage(id: $id, title: $title, message: $message, color: $color, icon: $icon)';
}


}

/// @nodoc
abstract mixin class $ToastMessageCopyWith<$Res>  {
  factory $ToastMessageCopyWith(ToastMessage value, $Res Function(ToastMessage) _then) = _$ToastMessageCopyWithImpl;
@useResult
$Res call({
 String id, String title, String? message, Color? color, IconData? icon
});




}
/// @nodoc
class _$ToastMessageCopyWithImpl<$Res>
    implements $ToastMessageCopyWith<$Res> {
  _$ToastMessageCopyWithImpl(this._self, this._then);

  final ToastMessage _self;
  final $Res Function(ToastMessage) _then;

/// Create a copy of ToastMessage
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? title = null,Object? message = freezed,Object? color = freezed,Object? icon = freezed,}) {
  return _then(ToastMessage(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,message: freezed == message ? _self.message : message // ignore: cast_nullable_to_non_nullable
as String?,color: freezed == color ? _self.color : color // ignore: cast_nullable_to_non_nullable
as Color?,icon: freezed == icon ? _self.icon : icon // ignore: cast_nullable_to_non_nullable
as IconData?,
  ));
}

}


/// Adds pattern-matching-related methods to [ToastMessage].
extension ToastMessagePatterns on ToastMessage {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ToastMessage value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ToastMessage() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ToastMessage value)  $default,){
final _that = this;
switch (_that) {
case _ToastMessage():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ToastMessage value)?  $default,){
final _that = this;
switch (_that) {
case _ToastMessage() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String title,  String? message,  Color? color,  IconData? icon)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ToastMessage() when $default != null:
return $default(_that.id,_that.title,_that.message,_that.color,_that.icon);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String title,  String? message,  Color? color,  IconData? icon)  $default,) {final _that = this;
switch (_that) {
case _ToastMessage():
return $default(_that.id,_that.title,_that.message,_that.color,_that.icon);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String title,  String? message,  Color? color,  IconData? icon)?  $default,) {final _that = this;
switch (_that) {
case _ToastMessage() when $default != null:
return $default(_that.id,_that.title,_that.message,_that.color,_that.icon);case _:
  return null;

}
}

}

/// @nodoc


class _ToastMessage implements ToastMessage {
  const _ToastMessage({required this.id, required this.title, this.message, this.color, this.icon});
  

@override final  String id;
@override final  String title;
@override final  String? message;
@override final  Color? color;
@override final  IconData? icon;

/// Create a copy of ToastMessage
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ToastMessageCopyWith<_ToastMessage> get copyWith => __$ToastMessageCopyWithImpl<_ToastMessage>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ToastMessage&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.message, message) || other.message == message)&&(identical(other.color, color) || other.color == color)&&(identical(other.icon, icon) || other.icon == icon));
}


@override
int get hashCode => Object.hash(runtimeType,id,title,message,color,icon);

@override
String toString() {
  return 'ToastMessage(id: $id, title: $title, message: $message, color: $color, icon: $icon)';
}


}

/// @nodoc
abstract mixin class _$ToastMessageCopyWith<$Res> implements $ToastMessageCopyWith<$Res> {
  factory _$ToastMessageCopyWith(_ToastMessage value, $Res Function(_ToastMessage) _then) = __$ToastMessageCopyWithImpl;
@override @useResult
$Res call({
 String id, String title, String? message, Color? color, IconData? icon
});




}
/// @nodoc
class __$ToastMessageCopyWithImpl<$Res>
    implements _$ToastMessageCopyWith<$Res> {
  __$ToastMessageCopyWithImpl(this._self, this._then);

  final _ToastMessage _self;
  final $Res Function(_ToastMessage) _then;

/// Create a copy of ToastMessage
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? title = null,Object? message = freezed,Object? color = freezed,Object? icon = freezed,}) {
  return _then(_ToastMessage(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,message: freezed == message ? _self.message : message // ignore: cast_nullable_to_non_nullable
as String?,color: freezed == color ? _self.color : color // ignore: cast_nullable_to_non_nullable
as Color?,icon: freezed == icon ? _self.icon : icon // ignore: cast_nullable_to_non_nullable
as IconData?,
  ));
}


}

/// @nodoc
mixin _$ToastState {

 List<ToastMessage> get toasts;
/// Create a copy of ToastState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ToastStateCopyWith<ToastState> get copyWith => _$ToastStateCopyWithImpl<ToastState>(this as ToastState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ToastState&&const DeepCollectionEquality().equals(other.toasts, toasts));
}


@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(toasts));

@override
String toString() {
  return 'ToastState(toasts: $toasts)';
}


}

/// @nodoc
abstract mixin class $ToastStateCopyWith<$Res>  {
  factory $ToastStateCopyWith(ToastState value, $Res Function(ToastState) _then) = _$ToastStateCopyWithImpl;
@useResult
$Res call({
 List<ToastMessage> toasts
});




}
/// @nodoc
class _$ToastStateCopyWithImpl<$Res>
    implements $ToastStateCopyWith<$Res> {
  _$ToastStateCopyWithImpl(this._self, this._then);

  final ToastState _self;
  final $Res Function(ToastState) _then;

/// Create a copy of ToastState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? toasts = null,}) {
  return _then(ToastState(
toasts: null == toasts ? _self.toasts : toasts // ignore: cast_nullable_to_non_nullable
as List<ToastMessage>,
  ));
}

}


/// Adds pattern-matching-related methods to [ToastState].
extension ToastStatePatterns on ToastState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ToastState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ToastState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ToastState value)  $default,){
final _that = this;
switch (_that) {
case _ToastState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ToastState value)?  $default,){
final _that = this;
switch (_that) {
case _ToastState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<ToastMessage> toasts)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ToastState() when $default != null:
return $default(_that.toasts);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<ToastMessage> toasts)  $default,) {final _that = this;
switch (_that) {
case _ToastState():
return $default(_that.toasts);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<ToastMessage> toasts)?  $default,) {final _that = this;
switch (_that) {
case _ToastState() when $default != null:
return $default(_that.toasts);case _:
  return null;

}
}

}

/// @nodoc


class _ToastState implements ToastState {
  const _ToastState({ List<ToastMessage> toasts = const []}): _toasts = toasts;
  

 final  List<ToastMessage> _toasts;
@override@JsonKey() List<ToastMessage> get toasts {
  if (_toasts is EqualUnmodifiableListView) return _toasts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_toasts);
}


/// Create a copy of ToastState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ToastStateCopyWith<_ToastState> get copyWith => __$ToastStateCopyWithImpl<_ToastState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ToastState&&const DeepCollectionEquality().equals(other._toasts, _toasts));
}


@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_toasts));

@override
String toString() {
  return 'ToastState(toasts: $toasts)';
}


}

/// @nodoc
abstract mixin class _$ToastStateCopyWith<$Res> implements $ToastStateCopyWith<$Res> {
  factory _$ToastStateCopyWith(_ToastState value, $Res Function(_ToastState) _then) = __$ToastStateCopyWithImpl;
@override @useResult
$Res call({
 List<ToastMessage> toasts
});




}
/// @nodoc
class __$ToastStateCopyWithImpl<$Res>
    implements _$ToastStateCopyWith<$Res> {
  __$ToastStateCopyWithImpl(this._self, this._then);

  final _ToastState _self;
  final $Res Function(_ToastState) _then;

/// Create a copy of ToastState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? toasts = null,}) {
  return _then(_ToastState(
toasts: null == toasts ? _self._toasts : toasts // ignore: cast_nullable_to_non_nullable
as List<ToastMessage>,
  ));
}


}

// dart format on
