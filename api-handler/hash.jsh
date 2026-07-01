import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
var e = new BCryptPasswordEncoder();
System.out.println(e.encode("password123"));
/exit
