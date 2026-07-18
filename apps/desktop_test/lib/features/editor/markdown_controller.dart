import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';

class MarkdownTextEditingController extends TextEditingController {
  final void Function(String)? onLinkTap;
  final void Function(String, Offset)? onLinkHover;
  final VoidCallback? onLinkExit;

  bool isSuppressed = false;
  int caretLine = 0;

  MarkdownTextEditingController({
    String? text,
    this.onLinkTap,
    this.onLinkHover,
    this.onLinkExit,
  }) : super(text: text);

  void setContentSilently(String newText, {bool preserveSelection = false}) {
    isSuppressed = true;
    final currentSelection = selection;
    value = TextEditingValue(
      text: newText,
      selection: preserveSelection && currentSelection.isValid
          ? TextSelection(
              baseOffset: currentSelection.baseOffset.clamp(0, newText.length),
              extentOffset: currentSelection.extentOffset.clamp(0, newText.length),
            )
          : const TextSelection.collapsed(offset: 0),
    );
    isSuppressed = false;
  }

  @override
  TextSpan buildTextSpan({
    required BuildContext context,
    TextStyle? style,
    required bool withComposing,
  }) {
    final lines = text.split('\n');
    final spans = <TextSpan>[];
    
    // Update caret line based on current selection
    if (selection.isValid && selection.baseOffset >= 0) {
      caretLine = '\n'.allMatches(text.substring(0, selection.baseOffset)).length;
    }

    final baseStyle = style ?? const TextStyle();
    bool inCodeBlock = false;
    String? currentCalloutType;

    for (var i = 0; i < lines.length; i++) {
      final isActive = i == caretLine;
      final line = lines[i];
      
      if (line.trim().startsWith('```')) {
        spans.add(_renderCodeBlockMarker(line, baseStyle, isActive));
        inCodeBlock = !inCodeBlock;
      } else if (inCodeBlock) {
        spans.add(_renderCodeBlockContent(line, baseStyle));
      } else {
        // Callouts
        final calloutMatch = RegExp(r'^>\s*\[!(\w+)\](.*)').firstMatch(line);
        if (calloutMatch != null) {
          currentCalloutType = calloutMatch.group(1)!.toLowerCase();
          spans.add(_renderCalloutTitle(line, calloutMatch, baseStyle, isActive, currentCalloutType));
        } else if (currentCalloutType != null && line.startsWith('>')) {
          spans.add(_renderCalloutBody(line, baseStyle, isActive, currentCalloutType));
        } else {
          currentCalloutType = null;
          spans.add(_renderLine(line, baseStyle, isActive));
        }
      }
      
      if (i != lines.length - 1) spans.add(const TextSpan(text: '\n'));
    }

    return TextSpan(style: baseStyle, children: spans);
  }

  TextSpan _renderLine(String line, TextStyle base, bool isActiveLine) {
    if (line.isEmpty) return const TextSpan();

    // Headers
    final headerMatch = RegExp(r'^(#{1,6})\s(.*)').firstMatch(line);
    if (headerMatch != null) {
      final level = headerMatch.group(1)!.length;
      final content = headerMatch.group(2)!;
      final sizeStep = [1.6, 1.4, 1.25, 1.15, 1.08, 1.0][level - 1];
      final headerStyle = base.copyWith(
        fontSize: (base.fontSize ?? 16) * sizeStep,
        fontWeight: FontWeight.bold,
      );
      
      final dimStyle = base.copyWith(color: base.color?.withOpacity(0.35));
      final marker = '${headerMatch.group(1)} ';
      
      return TextSpan(children: [
        TextSpan(
          text: marker,
          style: isActiveLine ? dimStyle : dimStyle.copyWith(color: base.color?.withOpacity(0.15)), // Even dimmer when inactive
        ),
        _renderInline(content, headerStyle, isActiveLine),
      ]);
    }
    
    // Blockquotes
    final quoteMatch = RegExp(r'^(\>\s)(.*)').firstMatch(line);
    if (quoteMatch != null) {
      final marker = quoteMatch.group(1)!;
      final content = quoteMatch.group(2)!;
      
      final dimStyle = base.copyWith(color: base.color?.withOpacity(0.35));
      final quoteStyle = base.copyWith(color: base.color?.withOpacity(0.7), fontStyle: FontStyle.italic);
      
      return TextSpan(children: [
        TextSpan(text: marker, style: dimStyle),
        _renderInline(content, quoteStyle, isActiveLine),
      ]);
    }
    
    // Lists and Checkboxes
    final listMatch = RegExp(r'^(\s*)(-\s\[\s\]\s|-\s\[x\]\s|-\s|\*\s|\d+\.\s)(.*)').firstMatch(line);
    if (listMatch != null) {
      final indent = listMatch.group(1)!;
      final marker = listMatch.group(2)!;
      final content = listMatch.group(3)!;

      final spans = <InlineSpan>[
        TextSpan(text: indent, style: base),
      ];

      if (marker.trim() == '- [ ]' || marker.trim() == '- [x]') {
        final isChecked = marker.trim() == '- [x]';
        
        if (isActiveLine) {
          spans.add(TextSpan(text: marker, style: base.copyWith(color: base.color?.withValues(alpha: 0.5))));
        } else {
          spans.add(
            WidgetSpan(
              alignment: PlaceholderAlignment.middle,
              child: Padding(
                padding: const EdgeInsets.only(right: 4.0),
                child: Icon(
                  isChecked ? Icons.check_box : Icons.check_box_outline_blank,
                  size: 18,
                  color: isChecked ? Colors.green : Colors.grey,
                ),
              ),
            )
          );
          spans.add(TextSpan(
            text: marker.substring(1), 
            style: const TextStyle(fontSize: 0, color: Colors.transparent, height: 0),
          ));
        }
        
        spans.add(_renderInline(content, isChecked ? base.copyWith(decoration: TextDecoration.lineThrough, color: base.color?.withValues(alpha: 0.5)) : base, isActiveLine));
      } else {
        spans.add(TextSpan(text: marker, style: base.copyWith(color: base.color?.withValues(alpha: 0.5))));
        spans.add(_renderInline(content, base, isActiveLine));
      }
      return TextSpan(children: spans);
    }

    // Horizontal Rules
    final hrMatch = RegExp(r'^(\s*)(---|\*\*\*|___)\s*$').firstMatch(line);
    if (hrMatch != null) {
      final hrStyle = base.copyWith(color: base.color?.withOpacity(0.3), fontWeight: FontWeight.w900, letterSpacing: 4.0);
      return TextSpan(text: line, style: hrStyle);
    }

    // Default line
    return _renderInline(line, base, isActiveLine);
  }

  TextSpan _renderInline(String line, TextStyle base, bool isActiveLine) {
    // Regex for **, *, ~~, `, ==, #tag, [[wikilink]], and [link](url)
    final pattern = RegExp(
      r'(\*\*.+?\*\*)|(\*.+?\*)|(~~.+?~~)|(`.+?`)|(==.+?==)|(#\w+)|(\[\[.+?\]\])|(\[.+?\]\(.+?\))',
    );
    final spans = <InlineSpan>[];
    var last = 0;

    for (final m in pattern.allMatches(line)) {
      if (m.start > last) {
        spans.add(TextSpan(text: line.substring(last, m.start), style: base));
      }
      final token = m.group(0)!;
      spans.add(_styleToken(token, base, isActiveLine));
      last = m.end;
    }
    if (last < line.length) {
      spans.add(TextSpan(text: line.substring(last), style: base));
    }
    return TextSpan(children: spans);
  }

  TextSpan _styleToken(String token, TextStyle base, bool isActiveLine) {
    TextStyle style = base;
    String inner = token;
    String prefix = '';
    String suffix = '';

    if (token.startsWith('**')) {
      style = base.copyWith(fontWeight: FontWeight.bold);
      prefix = '**';
      suffix = '**';
      inner = token.substring(2, token.length - 2);
    } else if (token.startsWith('~~')) {
      style = base.copyWith(decoration: TextDecoration.lineThrough);
      prefix = '~~';
      suffix = '~~';
      inner = token.substring(2, token.length - 2);
    } else if (token.startsWith('`')) {
      style = base.copyWith(
        fontFamily: 'monospace',
        color: base.color?.withOpacity(0.8),
        backgroundColor: base.color?.withOpacity(0.08),
      );
      prefix = '`';
      suffix = '`';
      inner = token.substring(1, token.length - 1);
    } else if (token.startsWith('*')) {
      style = base.copyWith(fontStyle: FontStyle.italic);
      prefix = '*';
      suffix = '*';
      inner = token.substring(1, token.length - 1);
    } else if (token.startsWith('==')) {
      style = base.copyWith(
        backgroundColor: const Color(0xFFFFF59D).withValues(alpha: 0.3),
        color: Colors.black87,
      );
      prefix = '==';
      suffix = '==';
      inner = token.substring(2, token.length - 2);
    } else if (token.startsWith('#')) {
      // Tags
      if (isActiveLine) {
        style = base.copyWith(color: Colors.purpleAccent.withValues(alpha: 0.8));
        return TextSpan(text: token, style: style);
      } else {
        return TextSpan(children: [
          WidgetSpan(
            alignment: PlaceholderAlignment.middle,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              margin: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(
                color: Colors.purpleAccent.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.purpleAccent.withValues(alpha: 0.4)),
              ),
              child: Text(token, style: base.copyWith(color: Colors.purpleAccent, fontSize: 13, fontWeight: FontWeight.w600)),
            )
          ),
          TextSpan(text: token.substring(1), style: const TextStyle(fontSize: 0, height: 0, color: Colors.transparent)),
        ]);
      }
    } else if (token.startsWith('[[')) {
      final linkContent = token.substring(2, token.length - 2);
      return TextSpan(
        text: token,
        style: base.copyWith(
          color: Colors.blueAccent.withOpacity(0.8),
          decoration: TextDecoration.underline,
        ),
        onEnter: (event) => onLinkHover?.call(linkContent, event.position),
        onExit: (event) => onLinkExit?.call(),
        recognizer: TapGestureRecognizer()
          ..onTap = () => onLinkTap?.call(linkContent),
      );
    } else if (token.startsWith('[')) {
      // Standard link
      final linkMatch = RegExp(r'\[(.+?)\]\((.+?)\)').firstMatch(token);
      if (linkMatch != null) {
        style = base.copyWith(color: Colors.blueAccent.withOpacity(0.8), decoration: TextDecoration.underline);
        final linkText = linkMatch.group(1)!;
        final linkUrl = linkMatch.group(2)!;
        
        final dim = base.copyWith(color: base.color?.withOpacity(0.35));
        final hidden = base.copyWith(color: base.color?.withOpacity(0.15)); // Dimmer when inactive
        
        return TextSpan(children: [
          TextSpan(text: '[', style: isActiveLine ? dim : hidden),
          TextSpan(text: linkText, style: style),
          TextSpan(text: '](', style: isActiveLine ? dim : hidden),
          TextSpan(text: linkUrl, style: isActiveLine ? dim : hidden),
          TextSpan(text: ')', style: isActiveLine ? dim : hidden),
        ]);
      }
    }

    final dim = base.copyWith(color: base.color?.withOpacity(0.35));
    final hidden = base.copyWith(color: base.color?.withOpacity(0.15)); // Dimmer when inactive
    
    return TextSpan(children: [
      TextSpan(text: prefix, style: isActiveLine ? dim : hidden),
      TextSpan(text: inner, style: style),
      TextSpan(text: suffix, style: isActiveLine ? dim : hidden),
    ]);
  }

  TextSpan _renderCodeBlockMarker(String line, TextStyle base, bool isActive) {
    final dim = base.copyWith(color: base.color?.withValues(alpha: 0.35));
    final hidden = base.copyWith(color: base.color?.withValues(alpha: 0.15));
    return TextSpan(text: line, style: isActive ? dim : hidden);
  }

  TextSpan _renderCodeBlockContent(String line, TextStyle base) {
    return TextSpan(
      text: line,
      style: base.copyWith(
        fontFamily: 'monospace',
        color: Colors.blueGrey[100],
        backgroundColor: Colors.black.withValues(alpha: 0.2), // Distinct block background
      ),
    );
  }

  Color _getCalloutColor(String type) {
    switch (type) {
      case 'note': return const Color(0xFF448AFF);
      case 'tip': return const Color(0xFF00BFA5);
      case 'warning': return const Color(0xFFFFAB40);
      case 'danger': return const Color(0xFFFF5252);
      case 'success': return const Color(0xFF69F0AE);
      case 'question': return const Color(0xFFAB47BC);
      default: return const Color(0xFF448AFF);
    }
  }

  IconData _getCalloutIcon(String type) {
    switch (type) {
      case 'note': return Icons.info_outline;
      case 'tip': return Icons.lightbulb_outline;
      case 'warning': return Icons.warning_amber_rounded;
      case 'danger': return Icons.error_outline;
      case 'success': return Icons.check_circle_outline;
      case 'question': return Icons.help_outline;
      default: return Icons.info_outline;
    }
  }

  TextSpan _renderCalloutTitle(String line, RegExpMatch match, TextStyle base, bool isActiveLine, String type) {
    final color = _getCalloutColor(type);
    final icon = _getCalloutIcon(type);
    
    final marker = '> [!$type]';
    final titleText = match.group(2)!.trim();
    
    if (isActiveLine) {
      return TextSpan(children: [
        TextSpan(text: '> [!$type] ', style: base.copyWith(color: color.withValues(alpha: 0.5))),
        _renderInline(titleText, base.copyWith(color: color, fontWeight: FontWeight.bold), isActiveLine),
      ]);
    } else {
      // Replace "> [!type] " with a WidgetSpan icon + padding
      final hiddenLen = marker.length + 1; // +1 for the space after it
      return TextSpan(
        style: base.copyWith(backgroundColor: color.withValues(alpha: 0.08)), // Slight tint
        children: [
          WidgetSpan(
            alignment: PlaceholderAlignment.middle,
            child: Container(
              decoration: BoxDecoration(border: Border(left: BorderSide(color: color, width: 3))),
              padding: const EdgeInsets.only(left: 8.0, right: 6.0),
              child: Icon(icon, size: 18, color: color),
            )
          ),
          TextSpan(text: marker + ' ', style: const TextStyle(fontSize: 0, height: 0, color: Colors.transparent)),
          TextSpan(
            text: titleText.isEmpty ? (type[0].toUpperCase() + type.substring(1)) : '', 
            style: base.copyWith(color: color, fontWeight: FontWeight.bold)
          ),
          _renderInline(titleText, base.copyWith(color: color, fontWeight: FontWeight.bold), isActiveLine),
        ]
      );
    }
  }

  TextSpan _renderCalloutBody(String line, TextStyle base, bool isActiveLine, String type) {
    final color = _getCalloutColor(type);
    
    final markerMatch = RegExp(r'^>\s*').firstMatch(line);
    final marker = markerMatch?.group(0) ?? '>';
    final content = line.substring(marker.length);
    
    if (isActiveLine) {
      return TextSpan(children: [
        TextSpan(text: marker, style: base.copyWith(color: color.withValues(alpha: 0.5))),
        _renderInline(content, base, isActiveLine),
      ]);
    } else {
      return TextSpan(
        style: base.copyWith(backgroundColor: color.withValues(alpha: 0.08)),
        children: [
          WidgetSpan(
            alignment: PlaceholderAlignment.middle,
            child: Container(
              decoration: BoxDecoration(border: Border(left: BorderSide(color: color, width: 3))),
              padding: const EdgeInsets.only(left: 14.0), // Padding to align with title text
            )
          ),
          TextSpan(text: marker, style: const TextStyle(fontSize: 0, height: 0, color: Colors.transparent)),
          _renderInline(content, base.copyWith(height: 1.5), isActiveLine),
        ]
      );
    }
  }
}
