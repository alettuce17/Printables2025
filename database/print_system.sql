-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 07, 2025 at 05:35 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `print_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_logs`
--

CREATE TABLE `admin_logs` (
  `id` int(11) NOT NULL,
  `admin_name` varchar(255) NOT NULL,
  `action_type` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_logs`
--

INSERT INTO `admin_logs` (`id`, `admin_name`, `action_type`, `description`, `created_at`) VALUES
(1, 'Admin User', 'refill_paper', 'Refilled all paper trays.', '2025-07-31 08:20:51');

-- --------------------------------------------------------

--
-- Table structure for table `error_reports`
--

CREATE TABLE `error_reports` (
  `id` int(11) NOT NULL,
  `job_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL COMMENT 'Unique identifier for a user session',
  `error_type` varchar(100) DEFAULT NULL,
  `description` text NOT NULL,
  `status` enum('unresolved','resolved') DEFAULT 'unresolved',
  `reported_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `error_reports`
--

INSERT INTO `error_reports` (`id`, `job_id`, `user_id`, `session_id`, `error_type`, `description`, `status`, `reported_at`) VALUES
(1, NULL, 2, NULL, 'printer_issue', 'Paper jam on tray 2.', 'unresolved', '2025-07-31 08:20:51');

-- --------------------------------------------------------

--
-- Table structure for table `pricing`
--

CREATE TABLE `pricing` (
  `id` int(11) NOT NULL,
  `tier_name` varchar(255) NOT NULL,
  `min_color_percent` decimal(5,2) NOT NULL,
  `max_color_percent` decimal(5,2) NOT NULL,
  `cost` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pricing`
--

INSERT INTO `pricing` (`id`, `tier_name`, `min_color_percent`, `max_color_percent`, `cost`) VALUES
(1, 'Black & White', 0.00, 0.10, 3.00),
(2, 'Low Color', 0.11, 29.99, 5.00),
(3, 'Medium Color', 30.00, 49.99, 8.00),
(4, 'Full Color / Photo', 50.00, 100.00, 10.00);

-- --------------------------------------------------------

--
-- Table structure for table `print_jobs`
--

CREATE TABLE `print_jobs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL COMMENT 'Unique identifier for a user session',
  `document_name` text NOT NULL,
  `pages` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `print_jobs`
--

INSERT INTO `print_jobs` (`id`, `user_id`, `session_id`, `document_name`, `pages`, `status`, `cost`, `submitted_at`, `completed_at`) VALUES
(2, NULL, NULL, 'sample-local-pdf.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 09:38:23', NULL),
(4, 3, NULL, 'sample-local-pdf.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 09:51:56', NULL),
(6, 4, NULL, 'sample-local-pdf.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 10:18:07', NULL),
(7, 5, NULL, 'sample-local-pdf.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 10:32:01', NULL),
(9, 5, NULL, 'sample-local-pdf.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 11:20:07', NULL),
(10, 5, NULL, 'sample-local-pdf.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 12:04:49', NULL),
(11, 5, NULL, 'sample-local-pdf.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 12:13:26', NULL),
(12, 5, NULL, 'sample-local-pdf.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 12:14:14', NULL),
(13, 5, 'sess-1753964752614-k73fnvg', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 12:26:15', NULL),
(14, 6, 'sess-1753964901504-t5whpjb', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 12:28:34', NULL),
(15, 5, 'sess-1753973246220-lyagt6j', '6_Activity_Lifecycle_and_State.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 14:47:51', NULL),
(16, 5, 'sess-1753974506032-b5dywez', 'att.c8CeAj6RZfXqkX_5TbZDv5_QV6Y6ePgEX9_QIXm_QAE.docx', NULL, 'sent_to_printer', NULL, '2025-07-31 15:10:52', NULL),
(17, 5, 'sess-1753975008722-v4zuv98', '6_Activity_Lifecycle_and_State.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 15:28:35', NULL),
(18, 5, 'sess-1753975906717-kp33q1w', '6_Activity_Lifecycle_and_State.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 15:33:04', NULL),
(19, 5, 'sess-1753975906717-kp33q1w', 'att.c8CeAj6RZfXqkX_5TbZDv5_QV6Y6ePgEX9_QIXm_QAE.docx', NULL, 'sent_to_printer', NULL, '2025-07-31 15:33:04', NULL),
(20, 5, 'sess-1753975906717-kp33q1w', 'rubrics.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 15:33:04', NULL),
(21, 5, 'sess-1753975906717-kp33q1w', 'Scanned_Document_7-17-25_at_9.49.08_AM.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 15:33:04', NULL),
(22, 5, 'sess-1753975906717-kp33q1w', 'Scanned_Document_9-17-24_at_6.59.28_PM.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 15:33:04', NULL),
(23, 5, 'sess-1753977839938-3383xts', '6_Activity_Lifecycle_and_State.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 16:04:33', NULL),
(24, 5, 'sess-1753978082307-pzzbydy', '6_Activity_Lifecycle_and_State.pdf', NULL, 'sent_to_printer', NULL, '2025-07-31 16:08:44', NULL),
(25, 5, 'sess-1754083855284-ccv8bhi', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', 9.00, '2025-08-01 21:35:29', NULL),
(26, 5, 'sess-1754096305220-cp1xya3', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', 3.00, '2025-08-02 01:00:10', NULL),
(27, 5, 'sess-1754099847425-gqncteg', 'activity.docx', NULL, 'sent_to_printer', 0.00, '2025-08-02 02:22:36', NULL),
(28, 5, 'sess-1754533873592-u7n9ae6', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', 11.00, '2025-08-07 02:32:21', NULL),
(29, 5, 'sess-1754534026600-jdnksv5', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', 3.00, '2025-08-07 02:34:05', NULL),
(30, 5, 'sess-1754534677054-w3al0xo', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', 3.00, '2025-08-07 02:45:06', NULL),
(31, 5, 'sess-1754535524020-xphqbdb', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', 5.00, '2025-08-07 02:59:07', NULL),
(32, 5, 'sess-1754535919921-vp747ay', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', 3.00, '2025-08-07 03:05:41', NULL),
(33, 5, 'sess-1754536184401-467xxpb', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', 3.00, '2025-08-07 03:10:36', NULL),
(34, 5, 'sess-1754536430081-6x5jwcw', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', 3.00, '2025-08-07 03:14:13', NULL),
(35, 5, 'sess-1754536658976-29l93b7', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', 3.00, '2025-08-07 03:18:01', NULL),
(36, 5, 'sess-1754536764548-o0fde8h', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', 11.00, '2025-08-07 03:19:36', NULL),
(37, 5, 'sess-1754536942334-6nrrgap', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', 8.00, '2025-08-07 03:22:39', NULL),
(38, 5, 'sess-1754537185298-ip0ygfm', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', 8.00, '2025-08-07 03:26:49', NULL),
(39, 5, 'sess-1754537321694-5owgywn', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', 5.00, '2025-08-07 03:29:02', NULL),
(40, 5, 'sess-1754537372695-yjcpkt5', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', 9.00, '2025-08-07 03:29:50', NULL),
(41, 5, 'sess-1754537496174-2c95plt', 'sample-local-pdf.pdf', NULL, 'sent_to_printer', 3.00, '2025-08-07 03:31:53', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `refund_requests`
--

CREATE TABLE `refund_requests` (
  `id` int(11) NOT NULL,
  `job_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL COMMENT 'Unique identifier for a user session',
  `amount_requested` decimal(10,2) NOT NULL,
  `reason` text NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `requested_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `refund_requests`
--

INSERT INTO `refund_requests` (`id`, `job_id`, `user_id`, `session_id`, `amount_requested`, `reason`, `status`, `requested_at`) VALUES
(1, NULL, 2, NULL, 2.00, 'Print failed due to paper jam, coins not returned.', 'pending', '2025-07-31 08:20:51');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `job_id` int(11) DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL COMMENT 'Unique identifier for a user session',
  `total_cost` decimal(10,2) NOT NULL,
  `amount_paid` decimal(10,2) NOT NULL,
  `change_due` decimal(10,2) NOT NULL,
  `successful` tinyint(1) DEFAULT 1,
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `job_id`, `session_id`, `total_cost`, `amount_paid`, `change_due`, `successful`, `note`, `created_at`) VALUES
(1, 9, NULL, 9.00, 9.00, 0.00, 1, NULL, '2025-07-31 11:20:07'),
(2, 10, NULL, 9.00, 9.00, 0.00, 1, NULL, '2025-07-31 12:04:49'),
(3, 11, NULL, 9.00, 9.00, 0.00, 1, NULL, '2025-07-31 12:13:26'),
(4, 12, NULL, 9.00, 9.00, 0.00, 1, NULL, '2025-07-31 12:14:14'),
(5, 13, 'sess-1753964752614-k73fnvg', 9.00, 9.00, 0.00, 1, NULL, '2025-07-31 12:26:15'),
(6, 14, 'sess-1753964901504-t5whpjb', 9.00, 9.00, 0.00, 1, NULL, '2025-07-31 12:28:34'),
(7, 15, 'sess-1753973246220-lyagt6j', 39.00, 39.00, 0.00, 1, NULL, '2025-07-31 14:47:51'),
(8, 16, 'sess-1753974506032-b5dywez', 6.00, 6.00, 0.00, 1, NULL, '2025-07-31 15:10:52'),
(9, 17, 'sess-1753975008722-v4zuv98', 39.00, 39.00, 0.00, 1, NULL, '2025-07-31 15:28:35'),
(10, 22, 'sess-1753975906717-kp33q1w', 126.00, 126.00, 0.00, 1, NULL, '2025-07-31 15:33:04'),
(11, 23, 'sess-1753977839938-3383xts', 39.00, 23432.00, 23393.00, 1, NULL, '2025-07-31 16:04:33'),
(12, 24, 'sess-1753978082307-pzzbydy', 39.00, 39.00, 0.00, 1, NULL, '2025-07-31 16:08:44'),
(13, 25, 'sess-1754083855284-ccv8bhi', 9.00, 9.00, 0.00, 1, NULL, '2025-08-01 21:35:29'),
(14, 26, 'sess-1754096305220-cp1xya3', 3.00, 3.00, 0.00, 1, NULL, '2025-08-02 01:00:10'),
(15, 27, 'sess-1754099847425-gqncteg', 0.00, 0.00, 0.00, 1, NULL, '2025-08-02 02:22:36'),
(16, 28, 'sess-1754533873592-u7n9ae6', 11.00, 11.00, 0.00, 1, NULL, '2025-08-07 02:32:21'),
(17, 29, 'sess-1754534026600-jdnksv5', 3.00, 3.00, 0.00, 1, NULL, '2025-08-07 02:34:05'),
(18, 30, 'sess-1754534677054-w3al0xo', 3.00, 3.00, 0.00, 1, NULL, '2025-08-07 02:45:06'),
(19, 31, 'sess-1754535524020-xphqbdb', 5.00, 5.00, 0.00, 1, NULL, '2025-08-07 02:59:07'),
(20, 32, 'sess-1754535919921-vp747ay', 3.00, 3.00, 0.00, 1, NULL, '2025-08-07 03:05:41'),
(21, 33, 'sess-1754536184401-467xxpb', 3.00, 3.00, 0.00, 1, NULL, '2025-08-07 03:10:36'),
(22, 34, 'sess-1754536430081-6x5jwcw', 3.00, 3.00, 0.00, 1, NULL, '2025-08-07 03:14:13'),
(23, 35, 'sess-1754536658976-29l93b7', 3.00, 3.00, 0.00, 1, NULL, '2025-08-07 03:18:01'),
(24, 36, 'sess-1754536764548-o0fde8h', 11.00, 11.00, 0.00, 1, NULL, '2025-08-07 03:19:36'),
(25, 37, 'sess-1754536942334-6nrrgap', 8.00, 11.00, 3.00, 1, NULL, '2025-08-07 03:22:39'),
(26, 38, 'sess-1754537185298-ip0ygfm', 8.00, 10.00, 2.00, 1, NULL, '2025-08-07 03:26:49'),
(27, 39, 'sess-1754537321694-5owgywn', 5.00, 5.00, 0.00, 1, NULL, '2025-08-07 03:29:02'),
(28, 40, 'sess-1754537372695-yjcpkt5', 9.00, 9.00, 0.00, 1, NULL, '2025-08-07 03:29:50'),
(29, 41, 'sess-1754537496174-2c95plt', 3.00, 3.00, 0.00, 1, NULL, '2025-08-07 03:31:53');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `student_id` varchar(255) DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `course` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `student_id`, `full_name`, `department`, `course`, `password`, `role`, `created_at`) VALUES
(1, 'admin', 'Administrator', NULL, NULL, 'pbkdf2:sha256:1000000$E8ORxH7Na5qvtUxB$ff31a179c1eb9208204d96ec42ff77c4c81407789fbe8e8c20c94b34f6049df6', 'admin', '2025-07-31 08:20:51'),
(2, 'S2023-001', 'John Doe', NULL, NULL, 'user_pass', 'user', '2025-07-31 08:20:51'),
(3, 'guest_bdb369bfd4513a64', 'Guest User', NULL, NULL, NULL, 'user', '2025-07-31 09:51:42'),
(4, 'guest_61cd399933bfac7f', 'Guest User', NULL, NULL, NULL, 'user', '2025-07-31 10:17:52'),
(5, 'guest_account', 'Guest User', NULL, NULL, NULL, 'user', '2025-07-31 10:31:47'),
(6, 'asdasd', 'asfd', NULL, NULL, NULL, 'user', '2025-07-31 11:17:37'),
(7, 'asd', NULL, NULL, NULL, NULL, 'user', '2025-08-07 02:51:39');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_logs`
--
ALTER TABLE `admin_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `error_reports`
--
ALTER TABLE `error_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `job_id` (`job_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `pricing`
--
ALTER TABLE `pricing`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `print_jobs`
--
ALTER TABLE `print_jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `refund_requests`
--
ALTER TABLE `refund_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `job_id` (`job_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `job_id` (`job_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_id` (`student_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_logs`
--
ALTER TABLE `admin_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `error_reports`
--
ALTER TABLE `error_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `pricing`
--
ALTER TABLE `pricing`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `print_jobs`
--
ALTER TABLE `print_jobs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `refund_requests`
--
ALTER TABLE `refund_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `error_reports`
--
ALTER TABLE `error_reports`
  ADD CONSTRAINT `error_reports_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `print_jobs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `error_reports_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `print_jobs`
--
ALTER TABLE `print_jobs`
  ADD CONSTRAINT `print_jobs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `refund_requests`
--
ALTER TABLE `refund_requests`
  ADD CONSTRAINT `refund_requests_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `print_jobs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `refund_requests_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `print_jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
