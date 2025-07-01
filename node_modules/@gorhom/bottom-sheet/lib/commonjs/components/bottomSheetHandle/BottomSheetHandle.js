"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _constants = require("./constants");
var _styles = require("./styles");
var _jsxRuntime = require("react/jsx-runtime");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function BottomSheetHandleComponent({
  style,
  indicatorStyle: _indicatorStyle,
  accessible = _constants.DEFAULT_ACCESSIBLE,
  accessibilityRole = _constants.DEFAULT_ACCESSIBILITY_ROLE,
  accessibilityLabel = _constants.DEFAULT_ACCESSIBILITY_LABEL,
  accessibilityHint = _constants.DEFAULT_ACCESSIBILITY_HINT,
  children
}) {
  //#region styles
  const containerStyle = (0, _react.useMemo)(() => [_styles.styles.container, _reactNative.StyleSheet.flatten(style)], [style]);
  const indicatorStyle = (0, _react.useMemo)(() => [_styles.styles.indicator, _reactNative.StyleSheet.flatten(_indicatorStyle)], [_indicatorStyle]);
  //#endregion

  // render
  return /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
    style: containerStyle,
    accessible: accessible ?? undefined,
    accessibilityRole: accessibilityRole ?? undefined,
    accessibilityLabel: accessibilityLabel ?? undefined,
    accessibilityHint: accessibilityHint ?? undefined,
    collapsable: true,
    children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
      style: indicatorStyle
    }), children]
  });
}
const BottomSheetHandle = /*#__PURE__*/(0, _react.memo)(BottomSheetHandleComponent);
BottomSheetHandle.displayName = 'BottomSheetHandle';
var _default = exports.default = BottomSheetHandle;
//# sourceMappingURL=BottomSheetHandle.js.map