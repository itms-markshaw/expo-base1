"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BottomSheetBody = void 0;
var _react = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _reactNativeReanimated = _interopRequireWildcard(require("react-native-reanimated"));
var _hooks = require("../../hooks");
var _styles = require("./styles");
var _jsxRuntime = require("react/jsx-runtime");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function BottomSheetBodyComponent({
  style,
  children
}) {
  //#region hooks
  const {
    animatedIndex,
    animatedPosition
  } = (0, _hooks.useBottomSheetInternal)();
  //#endregion

  //#region styles
  const containerAnimatedStyle = (0, _reactNativeReanimated.useAnimatedStyle)(() => ({
    opacity: _reactNative.Platform.OS === 'android' && animatedIndex.get() === -1 ? 0 : 1,
    transform: [{
      translateY: animatedPosition.get()
    }]
  }), [animatedPosition, animatedIndex]);
  const containerStyle = (0, _react.useMemo)(() => [style, _styles.styles.container, containerAnimatedStyle], [style, containerAnimatedStyle]);
  //#endregion

  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNativeReanimated.default.View, {
    style: containerStyle,
    collapsable: true,
    children: children
  });
}
const BottomSheetBody = exports.BottomSheetBody = /*#__PURE__*/(0, _react.memo)(BottomSheetBodyComponent);
BottomSheetBody.displayName = 'BottomSheetBody';
//# sourceMappingURL=BottomSheetBody.js.map