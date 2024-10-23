import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

interface AddQuizFormProps {
  onAddQuiz: (name: string, link: string) => void;
}

const AddQuizForm = ({ onAddQuiz }: AddQuizFormProps) => {
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !link) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    onAddQuiz(name, link);
    setName("");
    setLink("");
    toast({
      title: "Success",
      description: "Quiz added successfully",
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Add New Quiz</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Quiz Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Input
              placeholder="Quiz Link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full">
            Add Quiz
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddQuizForm;