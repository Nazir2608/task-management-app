package com.nazir.taskmanagement.controller;

import com.nazir.taskmanagement.dto.request.ProjectRequest;
import com.nazir.taskmanagement.dto.response.*;
import com.nazir.taskmanagement.entity.User;
import com.nazir.taskmanagement.service.ProjectService;
import com.nazir.taskmanagement.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Projects", description = "Create and manage projects")
public class ProjectController {

    private final ProjectService projectService;
    private final UserService userService;

    @PostMapping
    @Operation(summary = "Create a new project")
    public ResponseEntity<ApiResponse<ProjectResponse>> createProject(@AuthenticationPrincipal UserDetails userDetails, @Valid @RequestBody ProjectRequest request) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        ProjectResponse project = projectService.createProject(request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Project created", project));
    }

    @GetMapping
    @Operation(summary = "Get all projects for current user")
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> getMyProjects(
        @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(projectService.getMyProjects(user)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get project by ID")
    public ResponseEntity<ApiResponse<ProjectResponse>> getProject(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(projectService.getProjectById(id, user)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update project details")
    public ResponseEntity<ApiResponse<ProjectResponse>> updateProject(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails, @Valid @RequestBody ProjectRequest request) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Project updated",
            projectService.updateProject(id, request, user)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a project")
    public ResponseEntity<ApiResponse<Void>> deleteProject(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        projectService.deleteProject(id, user);
        return ResponseEntity.ok(ApiResponse.success("Project deleted successfully", null));
    }

    @PostMapping("/{id}/members/{userId}")
    @Operation(summary = "Add a member to the project")
    public ResponseEntity<ApiResponse<ProjectResponse>> addMember(@PathVariable Long id, @PathVariable Long userId, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Member added",
            projectService.addMember(id, userId, user)));
    }

    @DeleteMapping("/{id}/members/{userId}")
    @Operation(summary = "Remove a member from the project")
    public ResponseEntity<ApiResponse<ProjectResponse>> removeMember(@PathVariable Long id, @PathVariable Long userId, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Member removed",
            projectService.removeMember(id, userId, user)));
    }
}
