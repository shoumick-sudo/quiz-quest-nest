import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const QuizAttempt = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Quizzes
          </Button>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4" style={{ height: "80vh" }}>
          <iframe
            src="about:blank"
            className="w-full h-full border-0"
            title="Quiz Frame"
          />
        </div>
      </div>
    </div>
  );
};

export default QuizAttempt;