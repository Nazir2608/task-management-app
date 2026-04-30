package com.nazir.taskmanagement.config;

import io.swagger.v3.oas.models.*;
import io.swagger.v3.oas.models.info.*;
import io.swagger.v3.oas.models.security.*;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Task Management API")
                .description("""
                    **Task Management Application** — A production-ready Jira/Trello clone built with Spring Boot 3 & Java 21.
                    
                    ## Authentication
                    Use the `/api/auth/login` endpoint to get a JWT token, then click **Authorize** and enter: `Bearer <token>`
                    
                    ## Default Credentials (Dev)
                    - Admin: `admin` / `Admin@123`
                    - Demo: `demo` / `Demo@123`
                    """)
                .version("1.0.0")
                .contact(new Contact()
                    .name("Nazir")
                    .email("nazir@taskmanager.com"))
                .license(new License()
                    .name("MIT License")
                    .url("https://opensource.org/licenses/MIT")))
            .servers(List.of(
                new Server().url("/").description("Current Server")
            ))
            .addSecurityItem(new SecurityRequirement().addList("Bearer Authentication"))
            .components(new Components()
                .addSecuritySchemes("Bearer Authentication",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("Enter JWT token obtained from /api/auth/login")));
    }
}
