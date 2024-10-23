import { useState, useEffect } from "react";
import AdminLogin from "@/components/AdminLogin";
import QuizList from "@/components/QuizList";
import AddQuizForm from "@/components/AddQuizForm";
import { Quiz } from "@/types/quiz";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  // Load quizzes from localStorage on component mount
  useEffect(() => {
    const savedQuizzes = localStorage.getItem('quizzes');
    if (savedQuizzes) {
      setQuizzes(JSON.parse(savedQuizzes));
    }
  }, []);

  const handleAddQuiz = (name: string, link: string) => {
    const newQuiz: Quiz = {
      id: Date.now().toString(),
      name,
      link,
      createdAt: new Date().toISOString(),
    };
    const updatedQuizzes = [newQuiz, ...quizzes];
    setQuizzes(updatedQuizzes);
    // Save to localStorage
    localStorage.setItem('quizzes', JSON.stringify(updatedQuizzes));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Quiz Portal</h1>
          {!isAdmin && !showLogin && (
            <Button onClick={() => setShowLogin(true)}>Admin Login</Button>
          )}
          {isAdmin && (
            <Button variant="outline" onClick={() => setIsAdmin(false)}>
              Logout
            </Button>
          )}
        </div>

        {showLogin && !isAdmin && (
          <div className="flex justify-center mb-8">
            <AdminLogin
              onLogin={() => {
                setIsAdmin(true);
                setShowLogin(false);
              }}
            />
          </div>
        )}

        {isAdmin && (
          <div className="mb-8">
            <AddQuizForm onAddQuiz={handleAddQuiz} />
          </div>
        )}

        {quizzes.length > 0 ? (
          <QuizList quizzes={quizzes} />
        ) : (
          <div className="text-center text-gray-500 mt-8">
            No quizzes available yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;