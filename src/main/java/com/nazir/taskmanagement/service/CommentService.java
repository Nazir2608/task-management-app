package com.nazir.taskmanagement.service;

import com.nazir.taskmanagement.dto.request.CommentRequest;
import com.nazir.taskmanagement.dto.response.CommentResponse;
import com.nazir.taskmanagement.entity.Comment;
import com.nazir.taskmanagement.entity.Task;
import com.nazir.taskmanagement.entity.User;
import com.nazir.taskmanagement.exception.UnauthorizedException;
import com.nazir.taskmanagement.repository.CommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final TaskService taskService;

    @Transactional
    public CommentResponse addComment(Long taskId, CommentRequest request, User currentUser) {
        Task task = taskService.findTaskById(taskId);

        if (!task.getProject().isOwner(currentUser) && !task.getProject().isMember(currentUser)) {
            throw new UnauthorizedException("You don't have access to this task");
        }

        Comment comment = Comment.builder()
            .content(request.getContent())
            .task(task)
            .author(currentUser)
            .build();

        return CommentResponse.from(commentRepository.save(comment));
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getTaskComments(Long taskId, User currentUser) {
        Task task = taskService.findTaskById(taskId);
        if (!task.getProject().isOwner(currentUser) && !task.getProject().isMember(currentUser)) {
            throw new UnauthorizedException("You don't have access to this task");
        }
        return commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId).stream()
            .map(CommentResponse::from)
            .toList();
    }

    @Transactional
    public CommentResponse updateComment(Long commentId, CommentRequest request, User currentUser) {
        Comment comment = commentRepository.findById(commentId)
            .orElseThrow(() -> new com.nazir.taskmanagement.exception.ResourceNotFoundException("Comment", commentId));

        if (!comment.getAuthor().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You can only edit your own comments");
        }

        comment.setContent(request.getContent());
        return CommentResponse.from(commentRepository.save(comment));
    }

    @Transactional
    public void deleteComment(Long commentId, User currentUser) {
        Comment comment = commentRepository.findById(commentId)
            .orElseThrow(() -> new com.nazir.taskmanagement.exception.ResourceNotFoundException("Comment", commentId));

        boolean isAuthor = comment.getAuthor().getId().equals(currentUser.getId());
        boolean isProjectOwner = comment.getTask().getProject().isOwner(currentUser);
        boolean isAdmin = currentUser.getRole().name().equals("ROLE_ADMIN");

        if (!isAuthor && !isProjectOwner && !isAdmin) {
            throw new UnauthorizedException("You don't have permission to delete this comment");
        }

        commentRepository.delete(comment);
    }
}
