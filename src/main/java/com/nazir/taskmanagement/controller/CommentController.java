package com.nazir.taskmanagement.controller;

import com.nazir.taskmanagement.dto.request.CommentRequest;
import com.nazir.taskmanagement.dto.response.*;
import com.nazir.taskmanagement.entity.User;
import com.nazir.taskmanagement.service.CommentService;
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
@RequestMapping("/api")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Comments", description = "Add and manage task comments")
public class CommentController {

    private final CommentService commentService;
    private final UserService userService;

    @PostMapping("/tasks/{taskId}/comments")
    @Operation(summary = "Add a comment to a task")
    public ResponseEntity<ApiResponse<CommentResponse>> addComment(
            @PathVariable Long taskId,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CommentRequest request) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        CommentResponse comment = commentService.addComment(taskId, request, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Comment added", comment));
    }

    @GetMapping("/tasks/{taskId}/comments")
    @Operation(summary = "Get all comments for a task")
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getTaskComments(
            @PathVariable Long taskId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                commentService.getTaskComments(taskId, user)));
    }

    @PutMapping("/comments/{commentId}")
    @Operation(summary = "Edit a comment (author only)")
    public ResponseEntity<ApiResponse<CommentResponse>> updateComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CommentRequest request) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Comment updated",
                commentService.updateComment(commentId, request, user)));
    }

    @DeleteMapping("/comments/{commentId}")
    @Operation(summary = "Delete a comment")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        commentService.deleteComment(commentId, user);
        return ResponseEntity.ok(ApiResponse.success("Comment deleted", null));
    }
}
