package com.lingora;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class PlacementQuestionService {

    private final List<PlacementQuestion> questionBank = new ArrayList<>();

    public PlacementQuestionService() {
        createQuestionBank();
    }

    private void createQuestionBank() {

        // ===== RẤT DỄ =====

        questionBank.add(new PlacementQuestion(
                1,
                "What is your name?",
                new String[]{
                        "My name is Tom.",
                        "I am fine.",
                        "I am twelve.",
                        "I live in London."
                },
                0,
                "Câu hỏi 'What is your name?' hỏi tên. Câu trả lời phù hợp là 'My name is Tom.'",
                "very_easy",
                "communication"
        ));

        questionBank.add(new PlacementQuestion(
                2,
                "Choose the correct word: I ___ a student.",
                new String[]{
                        "am",
                        "is",
                        "are",
                        "be"
                },
                0,
                "Với chủ ngữ 'I', động từ to be là 'am'.",
                "very_easy",
                "grammar"
        ));

        questionBank.add(new PlacementQuestion(
                3,
                "What color is the sky on a clear day?",
                new String[]{
                        "Blue",
                        "Green",
                        "Black",
                        "Pink"
                },
                0,
                "Bầu trời trong xanh thường có màu blue.",
                "very_easy",
                "vocabulary"
        ));

        // ===== DỄ =====

        questionBank.add(new PlacementQuestion(
                4,
                "She ___ English every day.",
                new String[]{
                        "study",
                        "studies",
                        "studying",
                        "studied"
                },
                1,
                "Chủ ngữ 'She' ở thì hiện tại đơn nên động từ study đổi thành studies.",
                "easy",
                "grammar"
        ));

        questionBank.add(new PlacementQuestion(
                5,
                "Where do you live?",
                new String[]{
                        "I live in Vietnam.",
                        "I am thirteen.",
                        "I am happy.",
                        "My name is Linh."
                },
                0,
                "Câu hỏi 'Where do you live?' hỏi nơi bạn sống.",
                "easy",
                "communication"
        ));

        questionBank.add(new PlacementQuestion(
                6,
                "Which word means 'nhanh'?",
                new String[]{
                        "Slow",
                        "Fast",
                        "Small",
                        "Late"
                },
                1,
                "'Fast' có nghĩa là nhanh.",
                "easy",
                "vocabulary"
        ));

        // ===== TRUNG BÌNH =====

        questionBank.add(new PlacementQuestion(
                7,
                "I ___ TV when my mother called me.",
                new String[]{
                        "watch",
                        "watched",
                        "was watching",
                        "am watching"
                },
                2,
                "Hành động đang diễn ra thì một hành động khác xen vào nên dùng quá khứ tiếp diễn: was watching.",
                "medium",
                "grammar"
        ));

        questionBank.add(new PlacementQuestion(
                8,
                "How long have you lived here?",
                new String[]{
                        "Since three years.",
                        "For three years.",
                        "At three years.",
                        "During three years."
                },
                1,
                "Với khoảng thời gian, dùng 'for': for three years.",
                "medium",
                "grammar"
        ));

        questionBank.add(new PlacementQuestion(
                9,
                "Choose the best response: Would you like some water?",
                new String[]{
                        "Yes, please.",
                        "Yes, I am.",
                        "Yes, I do.",
                        "Yes, I can."
                },
                0,
                "Với lời mời 'Would you like...?', câu trả lời tự nhiên là 'Yes, please.'",
                "medium",
                "communication"
        ));

        // ===== KHÓ =====

        questionBank.add(new PlacementQuestion(
                10,
                "If I had more free time, I ___ another language.",
                new String[]{
                        "learn",
                        "will learn",
                        "would learn",
                        "am learning"
                },
                2,
                "Đây là câu điều kiện loại 2: If + past simple, would + verb.",
                "hard",
                "grammar"
        ));

        questionBank.add(new PlacementQuestion(
                11,
                "By the time we arrived, the movie ___.",
                new String[]{
                        "started",
                        "has started",
                        "had started",
                        "starts"
                },
                2,
                "Một hành động xảy ra trước một hành động khác trong quá khứ dùng quá khứ hoàn thành: had started.",
                "hard",
                "grammar"
        ));

        questionBank.add(new PlacementQuestion(
                12,
                "Which sentence is the most natural?",
                new String[]{
                        "I have been studying English for two years.",
                        "I am study English since two years.",
                        "I study English from two years.",
                        "I was study English for two years."
                },
                0,
                "Present perfect continuous phù hợp với hành động bắt đầu trong quá khứ và vẫn tiếp diễn.",
                "hard",
                "grammar"
        ));

        // ===== RẤT KHÓ =====

        questionBank.add(new PlacementQuestion(
                13,
                "Had I known about the problem, I ___ you earlier.",
                new String[]{
                        "would tell",
                        "would have told",
                        "will tell",
                        "told"
                },
                1,
                "Đây là dạng đảo ngữ của câu điều kiện loại 3: Had I known..., I would have told...",
                "very_hard",
                "grammar"
        ));

        questionBank.add(new PlacementQuestion(
                14,
                "Choose the best meaning of 'Although it was raining, we went outside.'",
                new String[]{
                        "We stayed inside because it rained.",
                        "We went outside despite the rain.",
                        "It stopped raining before we went outside.",
                        "We wanted it to rain."
                },
                1,
                "'Although' thể hiện sự tương phản: trời mưa nhưng chúng tôi vẫn ra ngoài.",
                "very_hard",
                "reading"
        ));

        questionBank.add(new PlacementQuestion(
                15,
                "Which sentence is grammatically correct?",
                new String[]{
                        "Neither of the answers are correct.",
                        "Neither of the answers is correct.",
                        "Neither answers is correct.",
                        "Neither answer are correct."
                },
                1,
                "'Neither' thường đi với động từ số ít trong cấu trúc chuẩn: Neither of the answers is correct.",
                "very_hard",
                "grammar"
        ));
    }

    public List<PlacementQuestion> getRandomQuestions(int amount) {

        List<PlacementQuestion> shuffled = new ArrayList<>(questionBank);

        Collections.shuffle(shuffled);

        if (amount >= shuffled.size()) {
            return shuffled;
        }

        return new ArrayList<>(shuffled.subList(0, amount));
    }

    public int getQuestionBankSize() {
        return questionBank.size();
    }
}