import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:brainstorm/features/onboarding/splash_view.dart';
import 'package:brainstorm/features/onboarding/project_onboarding_view.dart';
import 'package:brainstorm/features/shell/shell_view.dart';

enum Routes {
  splash('/'),
  projectOnboarding('/project_onboarding'),
  shell('/shell');

  final String value;
  const Routes(this.value);
}

final _splashRoute = GoRoute(
  path: Routes.splash.value,
  name: Routes.splash.name,
  builder: (context, state) => const SplashView(),
);

final _projectOnboardingRoute = GoRoute(
  path: Routes.projectOnboarding.value,
  name: Routes.projectOnboarding.name,
  builder: (context, state) => const ProjectOnboardingView(),
);

final _shellRoute = GoRoute(
  path: Routes.shell.value,
  name: Routes.shell.name,
  pageBuilder: (context, state) => CustomTransitionPage(
    key: state.pageKey,
    child: const ShellView(),
    transitionDuration: const Duration(milliseconds: 250),
    reverseTransitionDuration: const Duration(milliseconds: 250),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      return FadeTransition(
        opacity: CurvedAnimation(parent: animation, curve: Curves.easeInOut),
        child: child,
      );
    },
  ),
);

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _router = GoRouter(
  initialLocation: Routes.splash.value,
  navigatorKey: _rootNavigatorKey,
  routes: [_splashRoute, _projectOnboardingRoute, _shellRoute],
);

GoRouter createRoute() {
  return _router;
}

//MARK: - Extensions
extension RoutesExtension on BuildContext {
  Future<T?> pushTo<T>(Routes route, {Object? extra}) {
    return pushNamed<T>(route.name, extra: extra);
  }

  void pushReplacementTo(Routes route, {Object? extra}) =>
      pushReplacementNamed(route.name, extra: extra);

  /// Replace current screen with splash
  void replaceWithSplash() => pushReplacementNamed(Routes.splash.name);

  void popRoute() => pop();

  void replaceAllWith(Routes route, {Object? extra}) {
    goNamed(route.name, extra: extra);
  }

  bool canPopRoute() => canPop();
}
