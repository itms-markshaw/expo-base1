"use strict";

import React, { memo, useCallback, useMemo, useRef } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useBottomSheetGestureHandlers, useBottomSheetInternal, useBoundingClientRect } from '../../hooks';
import { print } from '../../utilities';
import { DEFAULT_ENABLE_HANDLE_PANNING_GESTURE } from '../bottomSheet/constants';
import BottomSheetHandle from './BottomSheetHandle';
import { jsx as _jsx } from "react/jsx-runtime";
function BottomSheetHandleContainerComponent({
  animatedIndex,
  animatedPosition,
  simultaneousHandlers: _internalSimultaneousHandlers,
  enableHandlePanningGesture = DEFAULT_ENABLE_HANDLE_PANNING_GESTURE,
  handleHeight,
  handleComponent,
  handleStyle: _providedHandleStyle,
  handleIndicatorStyle: _providedIndicatorStyle
}) {
  //#region refs
  const ref = useRef(null);
  //#endregion

  //#region hooks
  const {
    activeOffsetX,
    activeOffsetY,
    failOffsetX,
    failOffsetY,
    waitFor,
    simultaneousHandlers: _providedSimultaneousHandlers
  } = useBottomSheetInternal();
  const {
    handlePanGestureHandler
  } = useBottomSheetGestureHandlers();
  //#endregion

  //#region variables
  const simultaneousHandlers = useMemo(() => {
    const refs = [];
    if (_internalSimultaneousHandlers) {
      refs.push(_internalSimultaneousHandlers);
    }
    if (_providedSimultaneousHandlers) {
      if (Array.isArray(_providedSimultaneousHandlers)) {
        refs.push(..._providedSimultaneousHandlers);
      } else {
        refs.push(_providedSimultaneousHandlers);
      }
    }
    return refs;
  }, [_providedSimultaneousHandlers, _internalSimultaneousHandlers]);
  const panGesture = useMemo(() => {
    let gesture = Gesture.Pan().enabled(enableHandlePanningGesture).shouldCancelWhenOutside(false).runOnJS(false).onStart(handlePanGestureHandler.handleOnStart).onChange(handlePanGestureHandler.handleOnChange).onEnd(handlePanGestureHandler.handleOnEnd).onFinalize(handlePanGestureHandler.handleOnFinalize);
    if (waitFor) {
      gesture = gesture.requireExternalGestureToFail(waitFor);
    }
    if (simultaneousHandlers) {
      gesture = gesture.simultaneousWithExternalGesture(simultaneousHandlers);
    }
    if (activeOffsetX) {
      gesture = gesture.activeOffsetX(activeOffsetX);
    }
    if (activeOffsetY) {
      gesture = gesture.activeOffsetY(activeOffsetY);
    }
    if (failOffsetX) {
      gesture = gesture.failOffsetX(failOffsetX);
    }
    if (failOffsetY) {
      gesture = gesture.failOffsetY(failOffsetY);
    }
    return gesture;
  }, [activeOffsetX, activeOffsetY, enableHandlePanningGesture, failOffsetX, failOffsetY, simultaneousHandlers, waitFor, handlePanGestureHandler.handleOnChange, handlePanGestureHandler.handleOnEnd, handlePanGestureHandler.handleOnFinalize, handlePanGestureHandler.handleOnStart]);
  //#endregion

  //#region callbacks
  const handleContainerLayout = useCallback(function handleContainerLayout({
    nativeEvent: {
      layout: {
        height
      }
    }
  }) {
    handleHeight.value = height;
    if (__DEV__) {
      print({
        component: BottomSheetHandleContainer.displayName,
        method: 'handleContainerLayout',
        category: 'layout',
        params: {
          height
        }
      });
    }
  }, [handleHeight]);
  const handleBoundingClientRect = useCallback(({
    height
  }) => {
    handleHeight.value = height;
    if (__DEV__) {
      print({
        component: BottomSheetHandleContainer.displayName,
        method: 'handleBoundingClientRect',
        category: 'layout',
        params: {
          height
        }
      });
    }
  }, [handleHeight]);
  //#endregion

  //#region effects
  useBoundingClientRect(ref, handleBoundingClientRect);
  //#endregion

  //#region renders
  const HandleComponent = handleComponent ?? BottomSheetHandle;
  return /*#__PURE__*/_jsx(GestureDetector, {
    gesture: panGesture,
    children: /*#__PURE__*/_jsx(Animated.View, {
      ref: ref,
      onLayout: handleContainerLayout,
      children: /*#__PURE__*/_jsx(HandleComponent, {
        animatedIndex: animatedIndex,
        animatedPosition: animatedPosition,
        style: _providedHandleStyle,
        indicatorStyle: _providedIndicatorStyle
      })
    }, "BottomSheetHandleContainer")
  });
  //#endregion
}
const BottomSheetHandleContainer = /*#__PURE__*/memo(BottomSheetHandleContainerComponent);
BottomSheetHandleContainer.displayName = 'BottomSheetHandleContainer';
export default BottomSheetHandleContainer;
//# sourceMappingURL=BottomSheetHandleContainer.js.map