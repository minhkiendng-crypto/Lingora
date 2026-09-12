package com.lingora;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@SpringBootApplication
@RestController
@RequestMapping("/api")
public class LingoraApplication {

    public static void main(String[] args) {
        SpringApplication.run(LingoraApplication.class, args);
    }

    // Kiểm tra server
    @GetMapping("/hello")
    public Map<String, String> hello() {
        return Map.of(
            "app", "Lingora",
            "message", "Lingora đang chạy!"
        );
    }

    // Trạng thái người học
    @GetMapping("/state")
    public Map<String, Object> state() {
        return Map.of(
            "hearts", 5,
            "streak", 0,
            "xp", 0,
            "level", 1,
            "lesson", 1,
            "goal", "communication"
        );
    }

    // Chọn mục tiêu học
    @PostMapping("/goal")
    public Map<String, String> goal(@RequestBody Map<String, String> request) {
        String goal = request.getOrDefault("goal", "communication");

        return Map.of(
            "status", "success",
            "goal", goal
        );
    }

    // Hoàn thành bài học
    @PostMapping("/lesson/complete")
    public Map<String, Object> completeLesson() {

        int xp = 20;

        return Map.of(
            "status", "success",
            "message", "Bạn đã hoàn thành bài học!",
            "xpEarned", xp,
            "hearts", 5,
            "streak", 1
        );
    }

    // Đăng ký tài khoản
    @PostMapping("/register")
    public Map<String, String> register(
            @RequestBody Map<String, String> request) {

        String username = request.getOrDefault("username", "");
        String password = request.getOrDefault("password", "");

        if (username.isBlank() || password.isBlank()) {
            return Map.of(
                "status", "error",
                "message", "Vui lòng nhập đầy đủ thông tin!"
            );
        }

        return Map.of(
            "status", "success",
            "message", "Đăng ký thành công!",
            "username", username
        );
    }

    // Đăng nhập
    @PostMapping("/login")
    public Map<String, String> login(
            @RequestBody Map<String, String> request) {

        String username = request.getOrDefault("username", "");
        String password = request.getOrDefault("password", "");

        if (username.isBlank() || password.isBlank()) {
            return Map.of(
                "status", "error",
                "message", "Vui lòng nhập tài khoản và mật khẩu!"
            );
        }

        return Map.of(
            "status", "success",
            "message", "Đăng nhập thành công!",
            "username", username
        );
    }
}