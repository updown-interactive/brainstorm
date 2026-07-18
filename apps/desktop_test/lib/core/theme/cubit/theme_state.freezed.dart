// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'theme_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$ThemeState {





@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ThemeState);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
  return 'ThemeState()';
}


}

/// @nodoc
class $ThemeStateCopyWith<$Res>  {
$ThemeStateCopyWith(ThemeState _, $Res Function(ThemeState) __);
}


/// Adds pattern-matching-related methods to [ThemeState].
extension ThemeStatePatterns on ThemeState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>({TResult Function( ThemeLoading value)?  loading,TResult Function( ThemeLoaded value)?  loaded,TResult Function( ThemeFailure value)?  failure,required TResult orElse(),}){
final _that = this;
switch (_that) {
case ThemeLoading() when loading != null:
return loading(_that);case ThemeLoaded() when loaded != null:
return loaded(_that);case ThemeFailure() when failure != null:
return failure(_that);case _:
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

@optionalTypeArgs TResult map<TResult extends Object?>({required TResult Function( ThemeLoading value)  loading,required TResult Function( ThemeLoaded value)  loaded,required TResult Function( ThemeFailure value)  failure,}){
final _that = this;
switch (_that) {
case ThemeLoading():
return loading(_that);case ThemeLoaded():
return loaded(_that);case ThemeFailure():
return failure(_that);}
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>({TResult? Function( ThemeLoading value)?  loading,TResult? Function( ThemeLoaded value)?  loaded,TResult? Function( ThemeFailure value)?  failure,}){
final _that = this;
switch (_that) {
case ThemeLoading() when loading != null:
return loading(_that);case ThemeLoaded() when loaded != null:
return loaded(_that);case ThemeFailure() when failure != null:
return failure(_that);case _:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>({TResult Function()?  loading,TResult Function( AppTheme theme)?  loaded,TResult Function( String message)?  failure,required TResult orElse(),}) {final _that = this;
switch (_that) {
case ThemeLoading() when loading != null:
return loading();case ThemeLoaded() when loaded != null:
return loaded(_that.theme);case ThemeFailure() when failure != null:
return failure(_that.message);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>({required TResult Function()  loading,required TResult Function( AppTheme theme)  loaded,required TResult Function( String message)  failure,}) {final _that = this;
switch (_that) {
case ThemeLoading():
return loading();case ThemeLoaded():
return loaded(_that.theme);case ThemeFailure():
return failure(_that.message);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>({TResult? Function()?  loading,TResult? Function( AppTheme theme)?  loaded,TResult? Function( String message)?  failure,}) {final _that = this;
switch (_that) {
case ThemeLoading() when loading != null:
return loading();case ThemeLoaded() when loaded != null:
return loaded(_that.theme);case ThemeFailure() when failure != null:
return failure(_that.message);case _:
  return null;

}
}

}

/// @nodoc


class ThemeLoading implements ThemeState {
  const ThemeLoading();
  






@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ThemeLoading);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
  return 'ThemeState.loading()';
}


}




/// @nodoc


class ThemeLoaded implements ThemeState {
  const ThemeLoaded({required this.theme});
  

 final  AppTheme theme;

/// Create a copy of ThemeState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ThemeLoadedCopyWith<ThemeLoaded> get copyWith => _$ThemeLoadedCopyWithImpl<ThemeLoaded>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ThemeLoaded&&(identical(other.theme, theme) || other.theme == theme));
}


@override
int get hashCode => Object.hash(runtimeType,theme);

@override
String toString() {
  return 'ThemeState.loaded(theme: $theme)';
}


}

/// @nodoc
abstract mixin class $ThemeLoadedCopyWith<$Res> implements $ThemeStateCopyWith<$Res> {
  factory $ThemeLoadedCopyWith(ThemeLoaded value, $Res Function(ThemeLoaded) _then) = _$ThemeLoadedCopyWithImpl;
@useResult
$Res call({
 AppTheme theme
});




}
/// @nodoc
class _$ThemeLoadedCopyWithImpl<$Res>
    implements $ThemeLoadedCopyWith<$Res> {
  _$ThemeLoadedCopyWithImpl(this._self, this._then);

  final ThemeLoaded _self;
  final $Res Function(ThemeLoaded) _then;

/// Create a copy of ThemeState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? theme = null,}) {
  return _then(ThemeLoaded(
theme: null == theme ? _self.theme : theme // ignore: cast_nullable_to_non_nullable
as AppTheme,
  ));
}


}

/// @nodoc


class ThemeFailure implements ThemeState {
  const ThemeFailure({required this.message});
  

 final  String message;

/// Create a copy of ThemeState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ThemeFailureCopyWith<ThemeFailure> get copyWith => _$ThemeFailureCopyWithImpl<ThemeFailure>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ThemeFailure&&(identical(other.message, message) || other.message == message));
}


@override
int get hashCode => Object.hash(runtimeType,message);

@override
String toString() {
  return 'ThemeState.failure(message: $message)';
}


}

/// @nodoc
abstract mixin class $ThemeFailureCopyWith<$Res> implements $ThemeStateCopyWith<$Res> {
  factory $ThemeFailureCopyWith(ThemeFailure value, $Res Function(ThemeFailure) _then) = _$ThemeFailureCopyWithImpl;
@useResult
$Res call({
 String message
});




}
/// @nodoc
class _$ThemeFailureCopyWithImpl<$Res>
    implements $ThemeFailureCopyWith<$Res> {
  _$ThemeFailureCopyWithImpl(this._self, this._then);

  final ThemeFailure _self;
  final $Res Function(ThemeFailure) _then;

/// Create a copy of ThemeState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? message = null,}) {
  return _then(ThemeFailure(
message: null == message ? _self.message : message // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
