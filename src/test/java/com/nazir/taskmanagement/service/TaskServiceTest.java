package com.nazir.taskmanagement.service;

import com.nazir.taskmanagement.dto.request.TaskRequest;
import com.nazir.taskmanagement.dto.request.TaskStatusRequest;
import com.nazir.taskmanagement.dto.response.TaskResponse;
import com.nazir.taskmanagement.entity.*;
import com.nazir.taskmanagement.entity.enums.*;
import com.nazir.taskmanagement.exception.ResourceNotFoundException;
import com.nazir.taskmanagement.exception.UnauthorizedException;
import com.nazir.taskmanagement.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock TaskRepository taskRepository;
    @Mock TaskActivityRepository activityRepository;
    @Mock ProjectService projectService;
    @Mock UserService userService;

    @InjectMocks TaskService taskService;

    private User owner;
    private User memberUser;
    private User outsider;
    private Project project;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(1L).username("owner")
                .role(Role.ROLE_MANAGER).enabled(true).build();
        memberUser = User.builder().id(2L).username("member")
                .role(Role.ROLE_USER).enabled(true).build();
        outsider = User.builder().id(3L).username("outsider")
                .role(Role.ROLE_USER).enabled(true).build();

        project = Project.builder().id(1L).name("Test Project")
                .key("TP").owner(owner).taskCounter(0).build();
        project.getMembers().add(owner);
        project.getMembers().add(memberUser);
    }

    // ── createTask ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("createTask — succeeds for project member")
    void createTask_memberUser_succeeds() {
        when(projectService.findProjectById(1L)).thenReturn(project);
        TaskRequest req = new TaskRequest();
        req.setTitle("New Task");
        req.setPriority(Priority.HIGH);

        Task saved = Task.builder().id(10L).taskNumber("TP-1").title("New Task")
                .status(TaskStatus.TODO).priority(Priority.HIGH).type(TaskType.TASK)
                .project(project).reporter(memberUser).loggedHours(0).comments(java.util.List.of())
                .build();
        when(taskRepository.save(any(Task.class))).thenReturn(saved);
        when(activityRepository.save(any())).thenReturn(null);

        TaskResponse resp = taskService.createTask(1L, req, memberUser);

        assertThat(resp).isNotNull();
        assertThat(resp.getTitle()).isEqualTo("New Task");
        verify(taskRepository).save(any(Task.class));
    }

    @Test
    @DisplayName("createTask — throws UnauthorizedException for non-member")
    void createTask_outsider_throws() {
        when(projectService.findProjectById(1L)).thenReturn(project);
        TaskRequest req = new TaskRequest();
        req.setTitle("Hack");

        assertThatThrownBy(() -> taskService.createTask(1L, req, outsider))
                .isInstanceOf(UnauthorizedException.class);
        verify(taskRepository, never()).save(any());
    }

    // ── findTaskById ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("findTaskById — throws when task not found")
    void findTaskById_notFound_throws() {
        when(taskRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> taskService.findTaskById(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── updateTaskStatus ──────────────────────────────────────────────────────

    @Test
    @DisplayName("updateTaskStatus — status changes correctly")
    void updateTaskStatus_changesStatus() {
        Task task = Task.builder().id(5L).taskNumber("TP-5").title("Fix Bug")
                .status(TaskStatus.TODO).priority(Priority.MEDIUM).type(TaskType.BUG)
                .project(project).reporter(owner).assignee(memberUser)
                .loggedHours(0).comments(java.util.List.of())
                .activities(java.util.List.of()).build();

        when(taskRepository.findById(5L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(activityRepository.save(any())).thenReturn(null);

        TaskStatusRequest req = new TaskStatusRequest(TaskStatus.IN_PROGRESS);
        TaskResponse resp = taskService.updateTaskStatus(5L, req, memberUser);

        assertThat(resp.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
    }

    // ── deleteTask ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("deleteTask — reporter can delete their own task")
    void deleteTask_byReporter_succeeds() {
        Task task = Task.builder().id(7L).taskNumber("TP-7").title("Old Task")
                .status(TaskStatus.TODO).priority(Priority.LOW).type(TaskType.TASK)
                .project(project).reporter(memberUser).loggedHours(0)
                .comments(java.util.List.of()).activities(java.util.List.of()).build();

        when(taskRepository.findById(7L)).thenReturn(Optional.of(task));
        taskService.deleteTask(7L, memberUser);
        verify(taskRepository).delete(task);
    }

    @Test
    @DisplayName("deleteTask — outsider cannot delete task")
    void deleteTask_byOutsider_throws() {
        Task task = Task.builder().id(8L).taskNumber("TP-8").title("Protected Task")
                .status(TaskStatus.TODO).priority(Priority.LOW).type(TaskType.TASK)
                .project(project).reporter(owner).loggedHours(0)
                .comments(java.util.List.of()).activities(java.util.List.of()).build();

        when(taskRepository.findById(8L)).thenReturn(Optional.of(task));
        assertThatThrownBy(() -> taskService.deleteTask(8L, outsider))
                .isInstanceOf(UnauthorizedException.class);
        verify(taskRepository, never()).delete(any());
    }
}
