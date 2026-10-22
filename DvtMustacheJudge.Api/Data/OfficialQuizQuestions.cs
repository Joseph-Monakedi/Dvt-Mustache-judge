using DvtMustacheJudge.Api.Models;

namespace DvtMustacheJudge.Api.Data;

public static class OfficialQuizQuestions
{
    public static List<QuizQuestion> CreateDefaultQuestions(Guid quizId)
    {
        return new List<QuizQuestion>
        {
            new()
            {
                Id = Guid.NewGuid(),
                QuizGameId = quizId,
                QuestionOrder = 1,
                QuestionText = "What is the official name for a moustache that is long and curled up at the ends, popular in the 1800s?",
                OptionA = "Handlebar",
                OptionB = "Pencil",
                OptionC = "Horseshoe",
                OptionD = "Walrus",
                CorrectOption = 0, // A: Handlebar
                TimeLimitSeconds = 20,
                Points = 1000
            },
            new()
            {
                Id = Guid.NewGuid(),
                QuizGameId = quizId,
                QuestionOrder = 2,
                QuestionText = "Which of these is a Movember focus area?",
                OptionA = "Prostate cancer",
                OptionB = "Heart disease in men",
                OptionC = "Support for men that can't grow facial hair",
                OptionD = "Lung cancer",
                CorrectOption = 0, // A: Prostate cancer
                TimeLimitSeconds = 20,
                Points = 1000
            },
            new()
            {
                Id = Guid.NewGuid(),
                QuizGameId = quizId,
                QuestionOrder = 3,
                QuestionText = "Which moustache style is named after a sea mammal?",
                OptionA = "Chevron",
                OptionB = "Walrus",
                OptionC = "Fu Manchu",
                OptionD = "Horseshoe",
                CorrectOption = 1, // B: Walrus
                TimeLimitSeconds = 20,
                Points = 1000
            },
            new()
            {
                Id = Guid.NewGuid(),
                QuizGameId = quizId,
                QuestionOrder = 4,
                QuestionText = "Which country did Movember start in?",
                OptionA = "United States",
                OptionB = "Canada",
                OptionC = "Australia",
                OptionD = "United Kingdom",
                CorrectOption = 2, // C: Australia
                TimeLimitSeconds = 20,
                Points = 1000
            },
            new()
            {
                Id = Guid.NewGuid(),
                QuizGameId = quizId,
                QuestionOrder = 5,
                QuestionText = "In which year did the first Movember take place?",
                OptionA = "1999",
                OptionB = "2003",
                OptionC = "2008",
                OptionD = "2011",
                CorrectOption = 1, // B: 2003
                TimeLimitSeconds = 20,
                Points = 1000
            },
            new()
            {
                Id = Guid.NewGuid(),
                QuizGameId = quizId,
                QuestionOrder = 6,
                QuestionText = "Which Spanish surrealist artist was famous for his waxed, upturned moustache?",
                OptionA = "Frida Kahlo",
                OptionB = "Pablo Picasso",
                OptionC = "Salvador Dalí",
                OptionD = "Diego Rivera",
                CorrectOption = 2, // C: Salvador Dalí
                TimeLimitSeconds = 20,
                Points = 1000
            },
            new()
            {
                Id = Guid.NewGuid(),
                QuizGameId = quizId,
                QuestionOrder = 7,
                QuestionText = "What does “Mo” in Movember stand for?",
                OptionA = "Mouth",
                OptionB = "Momentum",
                OptionC = "Moustache",
                OptionD = "Money",
                CorrectOption = 2, // C: Moustache
                TimeLimitSeconds = 20,
                Points = 1000
            },
            new()
            {
                Id = Guid.NewGuid(),
                QuizGameId = quizId,
                QuestionOrder = 8,
                QuestionText = "Which moustache style has a thin strip on the upper lip plus longer hair running down past the mouth to the chin?",
                OptionA = "Fu Manchu",
                OptionB = "Chevron",
                OptionC = "Walrus",
                OptionD = "Horseshoe",
                CorrectOption = 0, // A: Fu Manchu
                TimeLimitSeconds = 20,
                Points = 1000
            },
            new()
            {
                Id = Guid.NewGuid(),
                QuizGameId = quizId,
                QuestionOrder = 9,
                QuestionText = "The chevron moustache is named after what?",
                OptionA = "A type of bird",
                OptionB = "A sports team logo",
                OptionC = "A V-shaped pattern",
                OptionD = "A famous hairdresser",
                CorrectOption = 2, // C: A V-shaped pattern
                TimeLimitSeconds = 20,
                Points = 1000
            },
            new()
            {
                Id = Guid.NewGuid(),
                QuizGameId = quizId,
                QuestionOrder = 10,
                QuestionText = "How many men took part in the very first Movember in 2003?",
                OptionA = "12",
                OptionB = "30",
                OptionC = "55",
                OptionD = "100",
                CorrectOption = 1, // B: 30
                TimeLimitSeconds = 20,
                Points = 1000
            },
            new()
            {
                Id = Guid.NewGuid(),
                QuizGameId = quizId,
                QuestionOrder = 11,
                QuestionText = "The Movember Foundation’s work focuses on men’s health. Which of these is NOT one of its core focus areas?",
                OptionA = "Prostate cancer",
                OptionB = "Testicular cancer",
                OptionC = "Mental health",
                OptionD = "Hair loss",
                CorrectOption = 3, // D: Hair loss
                TimeLimitSeconds = 20,
                Points = 1000
            },
            new()
            {
                Id = Guid.NewGuid(),
                QuizGameId = quizId,
                QuestionOrder = 12,
                QuestionText = "Which type of cancer is the most commonly diagnosed cancer in men in many countries?",
                OptionA = "Lung cancer",
                OptionB = "Prostate cancer",
                OptionC = "Testicular cancer",
                OptionD = "Pancreatic cancer",
                CorrectOption = 1, // B: Prostate cancer
                TimeLimitSeconds = 20,
                Points = 1000
            }
        };
    }
}
