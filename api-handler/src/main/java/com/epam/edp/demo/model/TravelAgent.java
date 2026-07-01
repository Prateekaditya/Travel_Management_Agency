package com.epam.edp.demo.model;


import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;


/**
 * MongoDB document representing an email address that should receive the travel-agent role.
 *
 * <p>The presence of an email in this collection is used by the automatic
 * role-assignment logic during registration.
 */
@Document(collection = "travel_agents")
public class TravelAgent {
    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    public String getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
