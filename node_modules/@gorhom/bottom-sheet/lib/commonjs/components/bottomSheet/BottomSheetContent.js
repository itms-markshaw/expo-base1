"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BottomSheetContent = void 0;
var _react = _interopRequireWildcard(require("react"));
var _reactNativeReanimated = _interopRequireWildcard(require("react-native-reanimated"));
var _constants = require("../../constants");
var _hooks = require("../../hooks");
var _utilities = require("../../utilities");
var _bottomSheetDraggableView = _interopRequireDefault(require("../bottomSheetDraggableView"));
var _constants2 = require("./constants");
var _jsxRuntime = require("react/jsx-runtime");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function BottomSheetContentComponent({
  detached,
  animationConfigs,
  overrideReduceMotion,
  keyboardBehavior,
  accessible,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  children
}) {
  //#region hooks
  const {
    enableDynamicSizing,
    overDragResistanceFactor,
    enableContentPanningGesture,
    animatedPosition,
    animatedHandleHeight,
    animatedHighestSnapPoint,
    animatedContainerHeight,
    animatedContentHeight,
    animatedSheetHeight,
    animatedKeyboardState,
    animatedKeyboardHeightInContainer,
    isInTemporaryPosition
  } = (0, _hooks.useBottomSheetInternal)();
  //#endregion

  //#region variables
  const animatedContentHeightMax = (0, _reactNativeReanimated.useDerivedValue)(() => {
    /**
     * if container height is not yet calculated, then we exit the method
     */
    if (animatedContainerHeight.get() === _constants2.INITIAL_CONTAINER_HEIGHT) {
      return 0;
    }
    const keyboardState = animatedKeyboardState.get();
    const keyboardHeightInContainer = animatedKeyboardHeightInContainer.get();
    const handleHeight = Math.max(0, animatedHandleHeight.get());
    const containerHeight = animatedContainerHeight.get();
    let contentHeight = animatedSheetHeight.get() - handleHeight;
    switch (keyboardBehavior) {
      case _constants.KEYBOARD_BEHAVIOR.extend:
        if (keyboardState === _constants.KEYBOARD_STATE.SHOWN) {
          contentHeight = contentHeight - keyboardHeightInContainer;
        }
        break;
      case _constants.KEYBOARD_BEHAVIOR.fillParent:
        if (!isInTemporaryPosition.get()) {
          break;
        }
        if (keyboardState === _constants.KEYBOARD_STATE.SHOWN) {
          contentHeight = containerHeight - handleHeight - keyboardHeightInContainer;
        } else {
          contentHeight = containerHeight - handleHeight;
        }
        break;
      case _constants.KEYBOARD_BEHAVIOR.interactive:
        {
          if (!isInTemporaryPosition.get()) {
            break;
          }
          const contentWithKeyboardHeight = contentHeight + keyboardHeightInContainer;
          if (keyboardState === _constants.KEYBOARD_STATE.SHOWN) {
            if (keyboardHeightInContainer + animatedSheetHeight.get() > containerHeight) {
              contentHeight = containerHeight - keyboardHeightInContainer - handleHeight;
            }
          } else if (contentWithKeyboardHeight + handleHeight > containerHeight) {
            contentHeight = containerHeight - handleHeight;
          } else {
            contentHeight = contentWithKeyboardHeight;
          }
          break;
        }
    }

    /**
     * before the container is measured, `contentHeight` value will be below zero,
     * which will lead to freeze the scrollable.
     *
     * @link (https://github.com/gorhom/react-native-bottom-sheet/issues/470)
     */
    return Math.max(contentHeight, 0);
  }, [animatedContainerHeight, animatedHandleHeight, animatedKeyboardHeightInContainer, animatedKeyboardState, animatedSheetHeight, isInTemporaryPosition, keyboardBehavior]);
  const animatedPaddingBottom = (0, _reactNativeReanimated.useDerivedValue)(() => {
    const containerHeight = animatedContainerHeight.get();
    /**
     * if container height is not yet calculated, then we exit the method
     */
    if (containerHeight === _constants2.INITIAL_CONTAINER_HEIGHT) {
      return 0;
    }
    const highestSnapPoint = Math.max(animatedHighestSnapPoint.get(), animatedPosition.get());
    /**
     * added safe area to prevent the sheet from floating above
     * the bottom of the screen, when sheet being over dragged or
     * when the sheet is resized.
     */
    const overDragSafePaddingBottom = Math.sqrt(highestSnapPoint - containerHeight * -1) * overDragResistanceFactor;
    let paddingBottom = overDragSafePaddingBottom;

    /**
     * if keyboard is open, then we try to add padding to prevent content
     * from being covered by the keyboard.
     */
    if (animatedKeyboardState.get() === _constants.KEYBOARD_STATE.SHOWN) {
      paddingBottom = overDragSafePaddingBottom + animatedKeyboardHeightInContainer.get();
    }
    return paddingBottom;
  }, [overDragResistanceFactor, animatedPosition, animatedContainerHeight, animatedHighestSnapPoint, animatedKeyboardState, animatedKeyboardHeightInContainer]);
  //#endregion

  //#region styles
  const contentMaskContainerAnimatedStyle = (0, _reactNativeReanimated.useAnimatedStyle)(() => {
    /**
     * if container height is not yet calculated, then we exit the method
     */
    if (animatedContainerHeight.get() === _constants2.INITIAL_CONTAINER_HEIGHT) {
      return {};
    }

    /**
     * if dynamic sizing is enabled, and content height
     * is still not set, then we exit method.
     */
    if (enableDynamicSizing && animatedContentHeight.get() === _constants2.INITIAL_CONTAINER_HEIGHT) {
      return {};
    }
    const paddingBottom = detached ? 0 : animatedPaddingBottom.get();
    return {
      paddingBottom: (0, _utilities.animate)({
        point: paddingBottom,
        configs: animationConfigs,
        overrideReduceMotion
      }),
      height: (0, _utilities.animate)({
        point: animatedContentHeightMax.get() + paddingBottom,
        configs: animationConfigs,
        overrideReduceMotion
      })
    };
  }, [overDragResistanceFactor, enableDynamicSizing, detached, animationConfigs, overrideReduceMotion, animatedContentHeight, animatedContentHeightMax, animatedContainerHeight]);
  const contentContainerStyle = (0, _react.useMemo)(() => [detached ? {
    overflow: 'visible'
  } : {
    overflow: 'hidden'
  }, contentMaskContainerAnimatedStyle], [contentMaskContainerAnimatedStyle, detached]);
  //#endregion

  //#region render
  const DraggableView = enableContentPanningGesture ? _bottomSheetDraggableView.default : _reactNativeReanimated.default.View;
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(DraggableView, {
    accessible: accessible,
    accessibilityLabel: accessibilityLabel,
    accessibilityHint: accessibilityHint,
    accessibilityRole: accessibilityRole,
    style: contentContainerStyle,
    children: children
  });
  //#endregion
}
const BottomSheetContent = exports.BottomSheetContent = /*#__PURE__*/(0, _react.memo)(BottomSheetContentComponent);
BottomSheetContent.displayName = 'BottomSheetContent';
//# sourceMappingURL=BottomSheetContent.js.map