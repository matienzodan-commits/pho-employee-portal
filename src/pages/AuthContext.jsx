import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Idinagdag para sa timing/race condition

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      // Kunin ang kasalukuyang session mula sa Supabase Auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        // Gagamitin natin ang EMAIL para i-link ang Auth Account sa Employees Table mo
        const { data: emp, error } = await supabase
          .from("employees")
          .select("*")
          .eq("email", authUser.email) 
          .maybeSingle(); // .maybeSingle() para hindi mag-406 error kung sakaling walang mahanap

        if (error) {
          console.error("Error fetching employee profile in AuthContext:", error.message);
        }

        if (emp) {
          // Pagsasamahin natin ang Auth details at ang profile data mula sa table
          setUser({ ...authUser, ...emp });
        } else {
          // Kung walang profile sa table, i-set pa rin ang auth details para hindi ma-log out
          setUser(authUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    fetchUser();

    // Tagapakinig kapag may nag-login o nag-logout para mag-auto refresh ang data
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}