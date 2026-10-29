package com.lingora;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

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
            "app", "EVERWORLD 3D RPG",
            "message", "EVERWORLD 3D Server đang chạy!"
        );
    }

    // Trạng thái nhân vật / game
    @GetMapping("/state")
    public Map<String, Object> state() {
        return Map.of(
            "hp", 100,
            "maxHp", 100,
            "chakra", 100,
            "maxChakra", 100,
            "zone", "Đồng Cỏ Huấn Luyện",
            "hearts", 5
        );
    }
}
