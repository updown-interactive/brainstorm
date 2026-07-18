import 'package:flutter/material.dart';
import 'package:brainstorm/app/app.dart';
import 'package:brainstorm/app/sl.dart' as di;
import 'package:brainstorm/app/window.dart' as window;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  di.init();
  await window.init();
  runApp(const UBrain());
}
