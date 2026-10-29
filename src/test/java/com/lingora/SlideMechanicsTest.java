package com.lingora;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class SlideMechanicsTest {

    public static class SlideController {
        private static final double INITIAL_SLIDE_SPEED = 20.0;
        private static final double DECELERATION = 14.0;

        private double currentSpeed = 0.0;
        private boolean isSliding = false;
        private boolean ctrlWasPressed = false;
        private boolean slideJustStarted = false;

        public void handleInput(boolean ctrlPressed, boolean isGrounded, double dt) {
            boolean ctrlTrigger = ctrlPressed && !ctrlWasPressed;
            ctrlWasPressed = ctrlPressed;

            if (isGrounded && ctrlTrigger && !isSliding) {
                isSliding = true;
                slideJustStarted = true;
                currentSpeed = INITIAL_SLIDE_SPEED;
            }

            if (isSliding) {
                if (slideJustStarted) {
                    currentSpeed = INITIAL_SLIDE_SPEED;
                    slideJustStarted = false;
                } else {
                    currentSpeed = Math.max(0.0, currentSpeed - DECELERATION * dt);
                }

                if (currentSpeed <= 0.0) {
                    isSliding = false;
                }
            }
        }

        public double getCurrentSpeed() {
            return currentSpeed;
        }

        public boolean isSliding() {
            return isSliding;
        }
    }

    private SlideController controller;

    @BeforeEach
    void setUp() {
        controller = new SlideController();
    }

    @Test
    @DisplayName("Slide initial speed is exactly 20.0 u/s when triggered")
    void testInitialSlideSpeed() {
        controller.handleInput(true, true, 0.016);

        assertTrue(controller.isSliding());
        assertEquals(20.0, controller.getCurrentSpeed(), 0.0001, "Initial slide speed must be exactly 20.0 u/s");
    }

    @Test
    @DisplayName("Initial frame applies full 20.0 u/s before deceleration kicks in")
    void testInitialFrameFullSpeedBeforeDeceleration() {
        // Frame 1: Slide starts
        controller.handleInput(true, true, 0.016);
        assertEquals(20.0, controller.getCurrentSpeed(), 0.0001);

        // Frame 2: Deceleration starts (20.0 - 14.0 * 0.1 = 18.6)
        controller.handleInput(true, true, 0.1);
        assertEquals(18.6, controller.getCurrentSpeed(), 0.0001);
    }

    @Test
    @DisplayName("Slide speed decelerates smoothly towards 0 without negative velocity")
    void testSlideDecelerationAndZeroTermination() {
        controller.handleInput(true, true, 0.016);
        assertEquals(20.0, controller.getCurrentSpeed(), 0.0001);

        for (int i = 0; i < 100; i++) {
            controller.handleInput(true, true, 0.02);
        }

        assertFalse(controller.isSliding());
        assertEquals(0.0, controller.getCurrentSpeed(), 0.0001, "Final slide speed must be exactly 0.0");
    }

    @Test
    @DisplayName("Holding Ctrl key continuously does NOT reset slide speed")
    void testHoldingCtrlDoesNotResetSpeed() {
        controller.handleInput(true, true, 0.016);
        assertEquals(20.0, controller.getCurrentSpeed(), 0.0001);

        controller.handleInput(true, true, 0.1);
        assertTrue(controller.getCurrentSpeed() < 20.0, "Speed should decrease while Ctrl is held");
        assertTrue(controller.getCurrentSpeed() > 0.0);
    }
}
