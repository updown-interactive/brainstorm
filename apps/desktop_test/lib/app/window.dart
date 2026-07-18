import 'dart:async';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:window_manager/window_manager.dart';

Future<void> init() async {
  if (kIsWeb ) {
    return;
  }
  await windowManager.ensureInitialized();
  const windowOptions = WindowOptions(
    size: Size(800, 720),
    center: true,
    skipTaskbar: false,
    titleBarStyle: TitleBarStyle.hidden,
    minimumSize: Size(800, 720),
  );
  unawaited(
    windowManager.waitUntilReadyToShow(windowOptions, () async {
      await windowManager.show();
      await windowManager.focus();
      await windowManager.maximize();
    }),
  );
}
