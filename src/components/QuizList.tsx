import { Quiz } from "@/types/quiz";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface QuizListProps {
  quizzes: Quiz[];
}

const QuizList = ({ quizzes }: QuizListProps) => {
  const navigate = useNavigate();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {quizzes.map((quiz) => (
        <Card key={quiz.id}>
          <CardHeader>
            <CardTitle>{quiz.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Added on: {new Date(quiz.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => navigate(`/quiz/${quiz.id}`)}
              className="w-full"
            >
              Attempt Quiz
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default QuizList;