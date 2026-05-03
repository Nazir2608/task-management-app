package com.nazir.taskmanagement.config;

import com.nazir.taskmanagement.entity.*;
import com.nazir.taskmanagement.entity.enums.*;
import com.nazir.taskmanagement.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            log.info("Database already initialized, skipping seed data.");
            return;
        }

        log.info("Seeding initial data...");

        // Create users
        User admin = userRepository.save(User.builder()
            .username("admin")
            .email("admin@taskmanager.com")
            .password(passwordEncoder.encode("Admin@123"))
            .firstName("Admin")
            .lastName("User")
            .role(Role.ROLE_ADMIN)
            .enabled(true)
            .build());

        User demo = userRepository.save(User.builder()
            .username("demo")
            .email("demo@taskmanager.com")
            .password(passwordEncoder.encode("Demo@123"))
            .firstName("Demo")
            .lastName("User")
            .role(Role.ROLE_USER)
            .enabled(true)
            .build());

        User dev1 = userRepository.save(User.builder()
            .username("alice")
            .email("alice@taskmanager.com")
            .password(passwordEncoder.encode("Alice@123"))
            .firstName("Alice")
            .lastName("Johnson")
            .role(Role.ROLE_MANAGER)
            .enabled(true)
            .build());

        // Create sample project
        Project project = Project.builder()
            .name("Task Manager App")
            .description("Building a production-ready Task Management Application using Spring Boot and Java 21")
            .key("TMA")
            .status(ProjectStatus.ACTIVE)
            .owner(admin)
            .build();
        project.getMembers().add(admin);
        project.getMembers().add(demo);
        project.getMembers().add(dev1);
        project = projectRepository.save(project);

        // Create sample tasks
        String[][] taskData = {
            {"Set up Spring Boot project", "DONE", "TASK", "HIGH", "alice"},
            {"Implement JWT Authentication", "DONE", "FEATURE", "CRITICAL", "admin"},
            {"Design database schema", "DONE", "TASK", "HIGH", "demo"},
            {"Build REST API endpoints", "IN_PROGRESS", "FEATURE", "HIGH", "admin"},
            {"Create Kanban board UI", "IN_PROGRESS", "FEATURE", "MEDIUM", "alice"},
            {"Write unit tests", "TODO", "TASK", "MEDIUM", "demo"},
            {"Add Swagger documentation", "TODO", "TASK", "LOW", "admin"},
            {"Fix login page bug", "TODO", "BUG", "CRITICAL", "alice"},
            {"Deploy to production", "BACKLOG", "TASK", "HIGH", null},
            {"Add email notifications", "BACKLOG", "FEATURE", "MEDIUM", null}
        };

        for (String[] data : taskData) {
            int counter = project.incrementTaskCounter();
            User assignee = switch (data[4] != null ? data[4] : "") {
                case "admin" -> admin;
                case "alice" -> dev1;
                case "demo" -> demo;
                default -> null;
            };

            taskRepository.save(Task.builder()
                .taskNumber(project.getKey() + "-" + counter)
                .title(data[0])
                .description("This is a sample task for demonstration purposes.")
                .status(TaskStatus.valueOf(data[1]))
                .type(TaskType.valueOf(data[2]))
                .priority(Priority.valueOf(data[3]))
                .project(project)
                .assignee(assignee)
                .reporter(admin)
                .dueDate(LocalDate.now().plusDays(counter * 3L))
                .estimatedHours(counter * 2)
                .loggedHours(data[1].equals("DONE") ? counter * 2 : 0)
                .build());
        }

        projectRepository.save(project);

        log.info(" Seed data created successfully!");
        log.info("   Admin:  admin / Admin@123");
        log.info("   Demo:   demo / Demo@123");
        log.info("   Alice:  alice / Alice@123");
    }
}
