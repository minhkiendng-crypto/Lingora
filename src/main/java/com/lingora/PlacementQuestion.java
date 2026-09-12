package com.lingora;

public class PlacementQuestion {

    private int id;
    private String question;
    private String[] answers;
    private int correct;
    private String explanation;
    private String difficulty;
    private String topic;

    public PlacementQuestion() {
    }

    public PlacementQuestion(
            int id,
            String question,
            String[] answers,
            int correct,
            String explanation,
            String difficulty,
            String topic) {

        this.id = id;
        this.question = question;
        this.answers = answers;
        this.correct = correct;
        this.explanation = explanation;
        this.difficulty = difficulty;
        this.topic = topic;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public String[] getAnswers() {
        return answers;
    }

    public void setAnswers(String[] answers) {
        this.answers = answers;
    }

    public int getCorrect() {
        return correct;
    }

    public void setCorrect(int correct) {
        this.correct = correct;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }
}