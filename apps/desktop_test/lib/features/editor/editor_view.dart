import 'dart:io';
import 'dart:async';
import 'package:flutter/services.dart';
import 'package:path/path.dart' as p;
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:brainstorm/core/theme/theme.dart';
import 'package:brainstorm/features/files/cubit/cubit.dart';
import 'package:brainstorm/features/editor/markdown_controller.dart';

class EditorView extends StatefulWidget {
  final String filePath;

  const EditorView({super.key, required this.filePath});

  @override
  State<EditorView> createState() => _EditorViewState();
}

class _EditorViewState extends State<EditorView> with WidgetsBindingObserver {
  late MarkdownTextEditingController _controller;
  Timer? _debounceTimer;
  String _currentHeader = '';
  String _lastText = '';
  late String _activePath;
  bool _renameInFlight = false;
  bool _lastSaveFailed = false;
  bool _pendingHeaderInsertion = false;

  OverlayEntry? _autocompleteEntry;
  String _autocompleteQuery = '';
  int _autocompleteStartOffset = -1;
  final LayerLink _layerLink = LayerLink();
  final GlobalKey _textFieldKey = GlobalKey();

  OverlayEntry? _hoverPreviewEntry;
  Timer? _previewTimer;
  String? _hoveredLink;

  @override
  void initState() {
    super.initState();
    _controller = MarkdownTextEditingController(
      onLinkTap: _onLinkTap,
      onLinkHover: _onLinkHover,
      onLinkExit: _onLinkExit,
    );
    _controller.addListener(_onTextChanged);
    WidgetsBinding.instance.addObserver(this);
    _activePath = widget.filePath;
    _loadFile();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached) {
      _debounceTimer?.cancel();
      _saveFile();
    }
  }

  @override
  void didUpdateWidget(EditorView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.filePath != widget.filePath && !_renameInFlight) {
      _switchFiles();
    }
  }

  Future<void> _switchFiles() async {
    await _saveFile();
    _activePath = widget.filePath;
    await _loadFile();
  }

  Future<void> _loadFile() async {
    final file = File(_activePath);
    if (!await file.exists()) {
      _controller.setContentSilently('');
      _currentHeader = '';
      return;
    }

    final raw = await file.readAsString();
    String display = raw;

    // Ensure the file starts with a header for display
    bool hasHeader = false;
    final lines = raw.split('\n');
    if (lines.isNotEmpty && RegExp(r'^(#{1,6})\s').hasMatch(lines.first)) {
      hasHeader = true;
    }

    if (!hasHeader) {
      String fileName = p.basename(_activePath);
      if (fileName.toLowerCase().endsWith('.md')) {
        fileName = fileName.substring(0, fileName.length - 3);
      }

      if (raw.trim().isEmpty) {
        display = '# $fileName\n';
      } else {
        display = '# $fileName\n\n$raw';
      }

      if (display != raw) {
        _pendingHeaderInsertion = true;
      }
    }

    _controller.setContentSilently(display, preserveSelection: true);
    _lastText = display;
    _updateCurrentHeader(display);
  }

  void _updateCurrentHeader(String content) {
    final lines = content.split('\n');
    if (lines.isNotEmpty) {
      final firstLine = lines.first;
      final headerMatch = RegExp(r'^(#{1,6})\s').firstMatch(firstLine);
      if (headerMatch != null) {
        _currentHeader = firstLine.substring(headerMatch.end).trim();
      } else {
        _currentHeader = firstLine.trim();
      }
    }
  }

  void _onTextChanged() {
    if (_controller.isSuppressed) return;

    final text = _controller.text;
    final offset = _controller.selection.baseOffset;

    // Auto-continue lists on Enter
    if (text.length > _lastText.length &&
        offset > 0 &&
        text[offset - 1] == '\n') {
      final lineStart = text.lastIndexOf('\n', offset - 2) + 1;
      final previousLine = text.substring(lineStart, offset - 1);

      final listMatch = RegExp(
        r'^(\s*)(-\s\[\s\]\s|-\s\[x\]\s|-\s|\*\s|\d+\.\s)',
      ).firstMatch(previousLine);
      if (listMatch != null) {
        final marker = listMatch.group(2)!;
        final indent = listMatch.group(1)!;

        if (previousLine.length == listMatch.group(0)!.length) {
          // Remove empty marker
          final newText = text.substring(0, lineStart) + text.substring(offset);
          _controller.setContentSilently(newText, preserveSelection: false);
          _controller.selection = TextSelection.collapsed(offset: lineStart);
        } else {
          // Continue list
          String newMarker = marker;
          if (RegExp(r'\d+\.\s').hasMatch(marker)) {
            final num = int.parse(marker.replaceAll(RegExp(r'[^\d]'), ''));
            newMarker = '${num + 1}. ';
          } else if (marker.contains('[x]')) {
            newMarker = '- [ ] ';
          }

          final injection = '$indent$newMarker';
          final newText =
              text.substring(0, offset) + injection + text.substring(offset);
          _controller.setContentSilently(newText, preserveSelection: false);
          _controller.selection = TextSelection.collapsed(
            offset: offset + injection.length,
          );
        }
      }
    }

    if (text != _lastText) {
      _checkAutocomplete(text, offset);
    } else {
      // Just a cursor movement. Hide autocomplete if we moved out of bounds.
      if (_autocompleteEntry != null) {
        if (offset < _autocompleteStartOffset - 2 || offset > _autocompleteStartOffset + _autocompleteQuery.length) {
          _removeAutocomplete();
        }
      }
    }
    
    _lastText = text;

    if (_pendingHeaderInsertion) {
      _pendingHeaderInsertion = false;
    }

    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 500), () async {
      await _saveFile();
      await _checkHeaderChange();
      if (mounted) setState(() {});
    });

    setState(() {});
  }

  void _checkAutocomplete(String text, int offset) {
    if (offset < 2) {
      _removeAutocomplete();
      return;
    }

    int lastOpen = text.lastIndexOf('[[', offset - 1);
    int lastClose = text.lastIndexOf(']]', offset - 1);

    if (lastOpen != -1 && lastOpen >= lastClose) {
      _autocompleteQuery = text.substring(lastOpen + 2, offset);
      _autocompleteStartOffset = lastOpen + 2;
      _showAutocomplete();
    } else {
      _removeAutocomplete();
    }
  }

  RenderObject? _findRenderEditable(RenderObject? root) {
    if (root == null) return null;
    if (root.runtimeType.toString().contains('RenderEditable')) return root;
    RenderObject? result;
    root.visitChildren((child) {
      result ??= _findRenderEditable(child);
    });
    return result;
  }

  void _showAutocomplete() {
    final allNotes = context.read<FilesCubit>().state.allNotes.keys.toList();
    final matches = allNotes.where((n) => n.toLowerCase().contains(_autocompleteQuery.toLowerCase())).toList();
    
    if (matches.isEmpty) {
      _removeAutocomplete();
      return;
    }
    
    Offset popupPosition = Offset(MediaQuery.of(context).size.width / 2 - 150, MediaQuery.of(context).size.height - 250);
    
    try {
      if (_textFieldKey.currentContext != null) {
        final renderObject = _textFieldKey.currentContext!.findRenderObject();
        final renderEditable = _findRenderEditable(renderObject);
        if (renderEditable != null) {
          // We must use dynamic to call getEndpointsForSelection because RenderEditable is not exported in material.dart easily
          final dynamic editable = renderEditable;
          final endpoints = editable.getEndpointsForSelection(_controller.selection);
          if (endpoints != null && endpoints.isNotEmpty) {
            final localOffset = endpoints[0].point;
            final globalOffset = (renderEditable as RenderBox).localToGlobal(localOffset as Offset);
            popupPosition = Offset(globalOffset.dx, globalOffset.dy + 24); // 24 is roughly line height
          }
        }
      }
    } catch (e) {
      print('Could not find cursor position: $e');
    }

    if (_autocompleteEntry == null) {
      _autocompleteEntry = OverlayEntry(
        builder: (ctx) => _buildAutocompleteMenu(ctx, matches, popupPosition),
      );
      Overlay.of(context).insert(_autocompleteEntry!);
    } else {
      // If position might have changed, recreate
      _autocompleteEntry?.remove();
      _autocompleteEntry = OverlayEntry(
        builder: (ctx) => _buildAutocompleteMenu(ctx, matches, popupPosition),
      );
      Overlay.of(context).insert(_autocompleteEntry!);
    }
  }

  void _removeAutocomplete() {
    _autocompleteEntry?.remove();
    _autocompleteEntry = null;
  }

  void _onLinkHover(String link, Offset globalPosition) {
    if (link != _hoveredLink) {
      _hoveredLink = link;
      _previewTimer?.cancel();
      _previewTimer = Timer(const Duration(milliseconds: 400), () {
        _showHoverPreview(link, globalPosition);
      });
    }
  }

  void _onLinkExit() {
    _hoveredLink = null;
    _previewTimer?.cancel();
    _previewTimer = Timer(const Duration(milliseconds: 300), () {
      if (_hoveredLink == null) {
        _hideHoverPreview();
      }
    });
  }

  void _onLinkTap(String link) {
    _navigateToNote(link);
  }

  Future<void> _showHoverPreview(String noteName, Offset globalPosition) async {
    final cubit = context.read<FilesCubit>();
    final allNotes = cubit.state.allNotes;
    
    String fullContent = '';
    bool exists = false;
    
    if (allNotes.containsKey(noteName)) {
      exists = true;
      try {
        final file = File(allNotes[noteName]!);
        fullContent = await file.readAsString();
      } catch (e) {
        fullContent = '*Could not load preview*';
      }
    }

    if (!mounted) return;
    
    _hideHoverPreview();
    
    _hoverPreviewEntry = OverlayEntry(
      builder: (ctx) => _buildHoverPreviewCard(ctx, noteName, fullContent, exists, globalPosition),
    );
    Overlay.of(context).insert(_hoverPreviewEntry!);
  }

  void _hideHoverPreview() {
    _hoverPreviewEntry?.remove();
    _hoverPreviewEntry = null;
  }

  Widget _buildHoverPreviewCard(BuildContext overlayContext, String title, String fullContent, bool exists, Offset position) {
    final colors = overlayContext.colors;
    final typography = overlayContext.typography;
    
    final screenSize = MediaQuery.of(overlayContext).size;
    
    // Size of the card
    const cardWidth = 450.0;
    const cardHeight = 400.0;

    double left = position.dx - (cardWidth / 2);
    double top = position.dy + 25;
    
    // Bounds checking
    if (left < 10) left = 10;
    if (left + cardWidth > screenSize.width - 10) left = screenSize.width - cardWidth - 10;
    
    if (top + cardHeight > screenSize.height - 10) {
      top = position.dy - cardHeight - 15;
    }

    final previewController = MarkdownTextEditingController(text: fullContent);

    return Positioned(
      top: top,
      left: left,
      width: cardWidth,
      height: cardHeight,
      child: MouseRegion(
        onEnter: (_) {
          _hoveredLink = title;
          _previewTimer?.cancel();
        },
        onExit: (_) {
          _hoveredLink = null;
          _previewTimer = Timer(const Duration(milliseconds: 300), () {
            if (_hoveredLink == null) _hideHoverPreview();
          });
        },
        child: Material(
          elevation: 24,
          shadowColor: Colors.black.withValues(alpha: 0.6),
          borderRadius: BorderRadius.circular(12),
          color: const Color(0xFF1E1E1E), // Dark aesthetic from screenshot
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withValues(alpha: 0.1), width: 1),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header with Expand icon
                Padding(
                  padding: const EdgeInsets.only(left: 20, right: 12, top: 12, bottom: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.chevron_right, size: 16, color: Colors.white.withValues(alpha: 0.5)),
                          const SizedBox(width: 4),
                          Text(
                            'Properties',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.8),
                              fontFamily: typography.fontFamily,
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.open_in_full, size: 16),
                        color: Colors.white.withValues(alpha: 0.5),
                        hoverColor: Colors.white.withValues(alpha: 0.1),
                        splashRadius: 16,
                        onPressed: () {
                          _hideHoverPreview();
                          _navigateToNote(title);
                        },
                      )
                    ],
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0),
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 12),
                          Text(
                            title,
                            style: TextStyle(
                              color: Colors.white,
                              fontFamily: typography.fontFamily,
                              fontWeight: FontWeight.bold,
                              fontSize: 32,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 24),
                          if (exists)
                            SelectableText.rich(
                              previewController.buildTextSpan(
                                context: overlayContext,
                                withComposing: false,
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.9),
                                  fontFamily: typography.fontFamily,
                                  fontSize: 15,
                                  height: 1.6,
                                ),
                              ),
                            )
                          else
                            Text(
                              'Click to create this note.',
                              style: TextStyle(
                                color: colors.primary,
                                fontFamily: typography.fontFamily,
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _insertAutocomplete(String noteName) {
    final text = _controller.text;
    final start = _autocompleteStartOffset;
    final end = _controller.selection.baseOffset;

    final newText =
        text.substring(0, start) + noteName + ']]' + text.substring(end);
    _controller.setContentSilently(newText, preserveSelection: false);
    _controller.selection = TextSelection.collapsed(
      offset: start + noteName.length + 2,
    );
    _removeAutocomplete();
    _onTextChanged();
  }

  Widget _buildAutocompleteMenu(BuildContext overlayContext, List<String> matches, Offset position) {
    // Clamp the position so it doesn't overflow the screen
    final screenSize = MediaQuery.of(overlayContext).size;
    double left = position.dx;
    double top = position.dy;
    
    if (left + 300 > screenSize.width) {
      left = screenSize.width - 310;
    }
    if (top + 250 > screenSize.height) {
      top = position.dy - 280; // Show above cursor instead
    }

    final colors = overlayContext.colors;
    final typography = overlayContext.typography;

    return Positioned(
      top: top,
      left: left,
      width: 300,
      child: Material(
        elevation: 8,
        shadowColor: Colors.black.withOpacity(0.5),
        borderRadius: BorderRadius.circular(8),
        color: colors.surface,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: colors.divider),
          ),
          constraints: const BoxConstraints(maxHeight: 250),
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: matches.length,
            itemBuilder: (context, index) {
              return ListTile(
                title: Text(
                  matches[index],
                  style: TextStyle(color: colors.text, fontFamily: typography.fontFamily),
                ),
                onTap: () => _insertAutocomplete(matches[index]),
                hoverColor: colors.primary.withOpacity(0.1),
              );
            },
          ),
        ),
      ),
    );
  }

  void _openLinkUnderCursor() {
    final text = _controller.text;
    final offset = _controller.selection.baseOffset;
    if (offset < 0) return;

    final matches = RegExp(r'\[\[(.+?)\]\]').allMatches(text);
    for (final m in matches) {
      if (offset >= m.start && offset <= m.end) {
        final noteName = m.group(1)!;
        _navigateToNote(noteName);
        return;
      }
    }
  }

  void _navigateToNote(String noteName) {
    final cubit = context.read<FilesCubit>();
    final allNotes = cubit.state.allNotes;
    
    if (allNotes.containsKey(noteName)) {
      cubit.selectPath(allNotes[noteName]!);
    } else {
      final colors = context.colors;
      final typography = context.typography;

      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          backgroundColor: colors.surface,
          elevation: 12,
          shadowColor: Colors.black.withOpacity(0.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: colors.divider),
          ),
          title: Text(
            'Create Note?',
            style: TextStyle(color: colors.text, fontFamily: typography.fontFamily, fontWeight: FontWeight.bold),
          ),
          content: Text(
            'The note "$noteName" does not exist. Would you like to create it?',
            style: TextStyle(color: colors.textMuted, fontFamily: typography.fontFamily),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Cancel', style: TextStyle(color: colors.textMuted, fontFamily: typography.fontFamily)),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                cubit.createAndOpenFile(noteName, _activePath);
              },
              child: Text('Create', style: TextStyle(color: colors.primary, fontFamily: typography.fontFamily, fontWeight: FontWeight.bold)),
            ),
          ],
        )
      );
    }
  }

  Future<void> _saveFile() async {
    if (_renameInFlight) return;
    try {
      final file = File(_activePath);
      if (await file.exists() || _controller.text.isNotEmpty) {
        await file.writeAsString(_controller.text);
      }
      _lastSaveFailed = false;
    } catch (e) {
      _lastSaveFailed = true;
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Could not save: $e')));
      }
    }
  }

  Future<void> _checkHeaderChange() async {
    final lines = _controller.text.split('\n');
    if (lines.isEmpty) return;

    final firstLine = lines.first;
    String newHeader = '';
    final headerMatch = RegExp(r'^(#{1,6})\s').firstMatch(firstLine);
    if (headerMatch != null) {
      newHeader = firstLine.substring(headerMatch.end).trim();
    } else {
      newHeader = firstLine.trim();
    }

    if (newHeader != _currentHeader) {
      _currentHeader = newHeader;
      _renameInFlight = true;
      try {
        final newName =
            newHeader.trim().replaceAll(RegExp(r'[<>:"/\\|?*]'), '') + '.md';
        final newPath = p.join(p.dirname(_activePath), newName);

        if (newPath != _activePath) {
          await context.read<FilesCubit>().renameEntity(_activePath, newName);
          _activePath = newPath;
        }
      } finally {
        _renameInFlight = false;
      }
    }
  }

  void _toggleWrapFormatting(String symbol) {
    final selection = _controller.selection;
    if (!selection.isValid) return;

    final text = _controller.text;
    final start = selection.start;
    final end = selection.end;

    if (start >= symbol.length && end <= text.length - symbol.length) {
      final before = text.substring(start - symbol.length, start);
      final after = text.substring(end, end + symbol.length);

      if (before == symbol && after == symbol) {
        final newText =
            text.substring(0, start - symbol.length) +
            text.substring(start, end) +
            text.substring(end + symbol.length);
        _controller.value = TextEditingValue(
          text: newText,
          selection: TextSelection(
            baseOffset: start - symbol.length,
            extentOffset: end - symbol.length,
          ),
        );
        _onTextChanged();
        return;
      }
    }

    final newText =
        text.substring(0, start) +
        symbol +
        text.substring(start, end) +
        symbol +
        text.substring(end);

    _controller.value = TextEditingValue(
      text: newText,
      selection: TextSelection(
        baseOffset: start + symbol.length,
        extentOffset: end + symbol.length,
      ),
    );
    _onTextChanged();
  }

  void _setHeaderLevel(int level) {
    final selection = _controller.selection;
    if (!selection.isValid) return;

    final text = _controller.text;
    final start = selection.start;

    int lineStart = 0;
    if (start > 0) {
      lineStart = text.lastIndexOf('\n', start - 1) + 1;
    }

    final lineEnd = text.indexOf('\n', lineStart);
    final actualLineEnd = lineEnd == -1 ? text.length : lineEnd;
    final line = text.substring(lineStart, actualLineEnd);

    String newLine;
    int offsetDelta = 0;

    final headerMatch = RegExp(r'^(#{1,6})\s').firstMatch(line);
    if (headerMatch != null) {
      final currentLevel = headerMatch.group(1)!.length;
      final lineContent = line.substring(headerMatch.end);

      if (currentLevel == level) {
        // Toggle off
        newLine = lineContent;
        offsetDelta = -(currentLevel + 1);
      } else {
        // Change level
        final newHashes = '#' * level;
        newLine = '$newHashes $lineContent';
        offsetDelta = level - currentLevel;
      }
    } else {
      // Add header
      final newHashes = '#' * level;
      newLine = '$newHashes $line';
      offsetDelta = level + 1;
    }

    final newText =
        text.substring(0, lineStart) + newLine + text.substring(actualLineEnd);

    _controller.value = TextEditingValue(
      text: newText,
      selection: TextSelection(
        baseOffset: (selection.baseOffset + offsetDelta).clamp(
          lineStart,
          newText.length,
        ),
        extentOffset: (selection.extentOffset + offsetDelta).clamp(
          lineStart,
          newText.length,
        ),
      ),
    );
    _onTextChanged();
  }

  void _forceSave() {
    _debounceTimer?.cancel();
    _saveFile().then((_) {
      _checkHeaderChange().then((_) {
        if (mounted) setState(() {});
      });
    });
  }

  void _handleTab(bool outdent) {
    final selection = _controller.selection;
    if (!selection.isValid) return;

    final text = _controller.text;
    int lineStart = 0;
    if (selection.start > 0) {
      lineStart = text.lastIndexOf('\n', selection.start - 1) + 1;
    }

    int lineEnd = text.indexOf('\n', selection.end);
    if (lineEnd == -1) lineEnd = text.length;

    final lines = text.substring(lineStart, lineEnd).split('\n');
    String newChunk = '';
    int offsetDelta = 0;

    for (int i = 0; i < lines.length; i++) {
      String line = lines[i];
      if (outdent) {
        if (line.startsWith('  ')) {
          line = line.substring(2);
          if (i == 0) offsetDelta = -2;
        }
      } else {
        line = '  ' + line;
        if (i == 0) offsetDelta = 2;
      }
      newChunk += line + (i == lines.length - 1 ? '' : '\n');
    }

    final newText =
        text.substring(0, lineStart) + newChunk + text.substring(lineEnd);
    _controller.value = TextEditingValue(
      text: newText,
      selection: TextSelection(
        baseOffset: (selection.baseOffset + offsetDelta).clamp(
          lineStart,
          newText.length,
        ),
        extentOffset:
            (selection.extentOffset +
                    (selection.start == selection.end ? offsetDelta : 0))
                .clamp(lineStart, newText.length),
      ),
    );
    _onTextChanged();
  }

  Widget _buildFormatButton(
    IconData icon,
    VoidCallback onTap,
    Color iconColor,
  ) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(4),
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Icon(icon, size: 18, color: iconColor),
      ),
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _debounceTimer?.cancel();
    _previewTimer?.cancel();
    _hideHoverPreview();
    _saveFile();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final typography = context.typography;

    final isSaving = _debounceTimer?.isActive ?? false;

    return Container(
      color: colors.background,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 16.0,
              vertical: 8.0,
            ),
            alignment: Alignment.centerRight,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  _lastSaveFailed
                      ? Icons.error_outline
                      : (isSaving ? Icons.sync : Icons.check_circle_outline),
                  size: 14,
                  color: _lastSaveFailed ? colors.error : colors.textMuted,
                ),
                const SizedBox(width: 4),
                Text(
                  _lastSaveFailed
                      ? 'Save failed'
                      : (isSaving ? 'Saving...' : 'Saved'),
                  style: TextStyle(
                    color: _lastSaveFailed ? colors.error : colors.textMuted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final width = constraints.maxWidth;
                final horizontalPadding = width < 600
                    ? 16.0
                    : (width < 1000 ? 32.0 : 64.0);

                return Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: horizontalPadding,
                    vertical: 16.0,
                  ),
                  child: CallbackShortcuts(
                    bindings: {
                      LogicalKeySet(
                        LogicalKeyboardKey.meta,
                        LogicalKeyboardKey.keyB,
                      ): () =>
                          _toggleWrapFormatting('**'),
                      LogicalKeySet(
                        LogicalKeyboardKey.control,
                        LogicalKeyboardKey.keyB,
                      ): () =>
                          _toggleWrapFormatting('**'),
                      LogicalKeySet(
                        LogicalKeyboardKey.meta,
                        LogicalKeyboardKey.keyI,
                      ): () =>
                          _toggleWrapFormatting('*'),
                      LogicalKeySet(
                        LogicalKeyboardKey.control,
                        LogicalKeyboardKey.keyI,
                      ): () =>
                          _toggleWrapFormatting('*'),
                      LogicalKeySet(
                        LogicalKeyboardKey.meta,
                        LogicalKeyboardKey.shift,
                        LogicalKeyboardKey.keyX,
                      ): () =>
                          _toggleWrapFormatting('~~'),
                      LogicalKeySet(
                        LogicalKeyboardKey.control,
                        LogicalKeyboardKey.shift,
                        LogicalKeyboardKey.keyX,
                      ): () =>
                          _toggleWrapFormatting('~~'),
                      LogicalKeySet(
                        LogicalKeyboardKey.meta,
                        LogicalKeyboardKey.keyE,
                      ): () =>
                          _toggleWrapFormatting('`'),
                      LogicalKeySet(
                        LogicalKeyboardKey.control,
                        LogicalKeyboardKey.keyE,
                      ): () =>
                          _toggleWrapFormatting('`'),
                      LogicalKeySet(
                        LogicalKeyboardKey.meta,
                        LogicalKeyboardKey.keyS,
                      ): _forceSave,
                      LogicalKeySet(
                        LogicalKeyboardKey.control,
                        LogicalKeyboardKey.keyS,
                      ): _forceSave,
                      LogicalKeySet(
                        LogicalKeyboardKey.meta,
                        LogicalKeyboardKey.digit1,
                      ): () =>
                          _setHeaderLevel(1),
                      LogicalKeySet(
                        LogicalKeyboardKey.control,
                        LogicalKeyboardKey.digit1,
                      ): () =>
                          _setHeaderLevel(1),
                      LogicalKeySet(
                        LogicalKeyboardKey.meta,
                        LogicalKeyboardKey.digit2,
                      ): () =>
                          _setHeaderLevel(2),
                      LogicalKeySet(
                        LogicalKeyboardKey.control,
                        LogicalKeyboardKey.digit2,
                      ): () =>
                          _setHeaderLevel(2),
                      LogicalKeySet(
                        LogicalKeyboardKey.meta,
                        LogicalKeyboardKey.digit3,
                      ): () =>
                          _setHeaderLevel(3),
                      LogicalKeySet(
                        LogicalKeyboardKey.control,
                        LogicalKeyboardKey.digit3,
                      ): () =>
                          _setHeaderLevel(3),
                      LogicalKeySet(
                        LogicalKeyboardKey.meta,
                        LogicalKeyboardKey.enter,
                      ): _openLinkUnderCursor,
                      LogicalKeySet(
                        LogicalKeyboardKey.control,
                        LogicalKeyboardKey.enter,
                      ): _openLinkUnderCursor,
                      LogicalKeySet(LogicalKeyboardKey.tab): () =>
                          _handleTab(false),
                      LogicalKeySet(
                        LogicalKeyboardKey.shift,
                        LogicalKeyboardKey.tab,
                      ): () =>
                          _handleTab(true),
                    },
                    child: CompositedTransformTarget(
                      link: _layerLink,
                      child: TextField(
                        key: _textFieldKey,
                        controller: _controller,
                        maxLines: null,
                        expands: true,
                        style: TextStyle(
                          color: colors.text,
                          fontFamily: typography.fontFamily,
                          fontSize: 16,
                          height: 1.6,
                        ),
                        decoration: const InputDecoration(
                          border: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          errorBorder: InputBorder.none,
                          disabledBorder: InputBorder.none,
                          contentPadding: EdgeInsets.zero,
                        ),
                        cursorColor: colors.primary,
                        contextMenuBuilder: (context, editableTextState) {
                          final anchors = editableTextState.contextMenuAnchors;

                          // Adjust position so it doesn't render off-screen if at the top
                          final topPos = anchors.primaryAnchor.dy - 45;
                          final actualTop = topPos < 0
                              ? anchors.primaryAnchor.dy + 30
                              : topPos;

                          return Stack(
                            children: [
                              Positioned(
                                top: actualTop,
                                left: anchors.primaryAnchor.dx.clamp(
                                  0.0,
                                  MediaQuery.of(context).size.width - 300,
                                ),
                                child: Material(
                                  elevation: 4,
                                  color: colors.surface,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    side: BorderSide(
                                      color: colors.divider,
                                      width: 1,
                                    ),
                                  ),
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 4.0,
                                      vertical: 4.0,
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        _buildFormatButton(
                                          Icons.format_bold,
                                          () {
                                            _toggleWrapFormatting('**');
                                            editableTextState.hideToolbar();
                                          },
                                          colors.text,
                                        ),
                                        _buildFormatButton(
                                          Icons.format_italic,
                                          () {
                                            _toggleWrapFormatting('*');
                                            editableTextState.hideToolbar();
                                          },
                                          colors.text,
                                        ),
                                        _buildFormatButton(
                                          Icons.format_strikethrough,
                                          () {
                                            _toggleWrapFormatting('~~');
                                            editableTextState.hideToolbar();
                                          },
                                          colors.text,
                                        ),
                                        _buildFormatButton(Icons.code, () {
                                          _toggleWrapFormatting('`');
                                          editableTextState.hideToolbar();
                                        }, colors.text),
                                        _buildFormatButton(Icons.title, () {
                                          _setHeaderLevel(1);
                                          editableTextState.hideToolbar();
                                        }, colors.text),
                                        Container(
                                          width: 1,
                                          height: 24,
                                          color: colors.divider,
                                          margin: const EdgeInsets.symmetric(
                                            horizontal: 4,
                                          ),
                                        ),
                                        _buildFormatButton(Icons.copy, () {
                                          editableTextState.copySelection(
                                            SelectionChangedCause.toolbar,
                                          );
                                          editableTextState.hideToolbar();
                                        }, colors.textMuted),
                                        _buildFormatButton(
                                          Icons.content_cut,
                                          () {
                                            editableTextState.cutSelection(
                                              SelectionChangedCause.toolbar,
                                            );
                                            editableTextState.hideToolbar();
                                          },
                                          colors.textMuted,
                                        ),
                                        _buildFormatButton(Icons.paste, () {
                                          editableTextState.pasteText(
                                            SelectionChangedCause.toolbar,
                                          );
                                          editableTextState.hideToolbar();
                                        }, colors.textMuted),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          );
                        },
                      ), // TextField
                    ), // CompositedTransformTarget
                  ), // CallbackShortcuts
                ); // Padding
              },
            ),
          ),
        ],
      ),
    );
  }
}
