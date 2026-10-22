package com.lingora;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class LingoraApplicationTests {

    @Autowired
    private LingoraApplication application;

    @Autowired
    private PlacementQuestionService questionService;

    @Test
    void contextLoads() {
        assertNotNull(application);
        assertNotNull(questionService);
    }

    @Test
    void testQuestionBankSize() {
        assertTrue(questionService.getQuestionBankSize() > 0);
    }

    @Test
    void testGetRandomQuestions() {
        var questions = questionService.getRandomQuestions(5);
        assertEquals(5, questions.size());
    }
}
