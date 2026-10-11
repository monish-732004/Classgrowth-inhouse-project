import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LogOut, PlusCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AdminDashboardProps {
  session: Session | null;
}

const categories = [
  { value: "Workshop", color: "bg-workshop" },
  { value: "Placement Info", color: "bg-placement" },
  { value: "Test Link", color: "bg-test" },
  { value: "Tech News", color: "bg-tech-news" },
  { value: "Industry Update", color: "bg-industry" },
];

const AdminDashboard = ({ session }: AdminDashboardProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [link, setLink] = useState("");
  const [category, setCategory] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPosts = async () => {
    console.log('Fetching posts...');
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }

      setPosts(data || []);
      return data || [];
      
    } catch (error) {
      console.error('Error in fetchPosts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts. Please check your internet connection and try again.",
        variant: "destructive",
      });
      return [];
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      try {
        console.log('Initializing Admin Dashboard...');
        
        // Fetch posts
        console.log('Fetching initial posts...');
        const posts = await fetchPosts();
        
        if (isMounted) {
          if (posts && posts.length > 0) {
            console.log(`Successfully loaded ${posts.length} posts`);
          } else {
            console.log('No posts found');
          }
        }
      } catch (error) {
        console.error('Initialization error:', error);
        
        if (isMounted) {
          toast({
            title: 'Initialization Error',
            description: 'Failed to initialize the dashboard. Please refresh the page or check your connection.',
            variant: 'destructive',
          });
        }
      }
    };
    
    initialize();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!title || !summary || !category) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (title, summary, and category)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    console.log('Starting post creation process...');
    
    try {
      // Create the post
      const postData = {
        title,
        summary,
        link: link || null,
        category: category as "Workshop" | "Placement Info" | "Test Link" | "Tech News" | "Industry Update",
        created_by: session?.user?.id || ""
      };

      console.log('Creating post with data:', postData);

      const { data: createdPost, error: postError } = await supabase
        .from("posts")
        .insert(postData)
        .select()
        .single();

      if (postError) throw postError;
      console.log('Post created successfully:', createdPost);
      
      // Update the local state to include the new post
      setPosts(prevPosts => [createdPost, ...prevPosts]);

      toast({
        title: "Success",
        description: "Post created successfully",
      });

      // Reset form
      setTitle("");
      setSummary("");
      setLink("");
      setCategory("");
      fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleDelete = async (postId: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", postId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
      fetchPosts();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const getCategoryColor = (cat: string) => {
    return categories.find((c) => c.value === cat)?.color || "bg-muted";
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage class updates and announcements</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                Create New Post
              </CardTitle>
              <CardDescription>Share updates with students</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief title for the update"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Summary</Label>
                  <Textarea
                    id="summary"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Two-line summary of the update"
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="link">Link (Optional)</Label>
                  <Input
                    id="link"
                    type="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://..."
                  />
                </div>


                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Post"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Recent Posts</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {posts.map((post) => (
                <Card key={post.id} className="shadow-card hover:shadow-hover transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-2">
                      <Badge className={`${getCategoryColor(post.category)} text-white`}>
                        {post.category}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(post.id)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <h3 className="font-semibold mb-1">{post.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{post.summary}</p>
                    <div className="mt-2 space-y-2">
                      {post.link && (
                        <a
                          href={post.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <span>View Link</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
