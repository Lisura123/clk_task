-- MariaDB dump 10.19  Distrib 10.4.28-MariaDB, for osx10.10 (x86_64)
--
-- Host: localhost    Database: clk_task
-- ------------------------------------------------------
-- Server version	10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `comment_attachments`
--

DROP TABLE IF EXISTS `comment_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `comment_attachments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `comment_id` bigint(20) unsigned NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_url` varchar(255) NOT NULL,
  `file_size` int(11) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `uploaded_by` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `comment_attachments_uploaded_by_foreign` (`uploaded_by`),
  KEY `comment_attachments_comment_id_index` (`comment_id`),
  CONSTRAINT `comment_attachments_comment_id_foreign` FOREIGN KEY (`comment_id`) REFERENCES `task_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comment_attachments_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comment_attachments`
--

LOCK TABLES `comment_attachments` WRITE;
/*!40000 ALTER TABLE `comment_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `comment_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comment_mentions`
--

DROP TABLE IF EXISTS `comment_mentions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `comment_mentions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `comment_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_mention` (`comment_id`,`user_id`),
  KEY `comment_mentions_comment_id_index` (`comment_id`),
  KEY `comment_mentions_user_id_index` (`user_id`),
  CONSTRAINT `comment_mentions_comment_id_foreign` FOREIGN KEY (`comment_id`) REFERENCES `task_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comment_mentions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comment_mentions`
--

LOCK TABLES `comment_mentions` WRITE;
/*!40000 ALTER TABLE `comment_mentions` DISABLE KEYS */;
/*!40000 ALTER TABLE `comment_mentions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `departments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `departments_name_unique` (`name`),
  KEY `departments_name_index` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (1,'Sales','Sales Department','2025-12-07 09:26:21','2025-12-07 09:26:21'),(2,'Design and Marketing','Design and Marketing Department','2025-12-07 09:26:21','2025-12-07 09:26:21'),(3,'Online','Online Operations Department','2025-12-07 09:26:21','2025-12-07 09:26:21'),(4,'Rent and Service','Rent and Service Department','2025-12-07 09:26:21','2025-12-07 09:26:21'),(5,'2nd Option','2nd Option Department','2025-12-07 09:26:21','2025-12-07 09:26:21'),(6,'Finance','Finance Department','2025-12-07 09:26:21','2025-12-07 09:26:21'),(7,'Procurement','Procurement Department','2025-12-07 09:26:21','2025-12-07 09:26:21'),(8,'Academy','Academy and Training Department','2025-12-07 09:26:21','2025-12-07 09:26:21'),(9,'Call Center','Call Center Department','2025-12-07 09:26:21','2025-12-07 09:26:21'),(10,'IT','Information Technology Department','2025-12-07 09:26:21','2025-12-07 09:26:21');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'2019_12_14_000001_create_personal_access_tokens_table',1),(2,'2024_01_01_000001_create_departments_table',1),(3,'2024_01_01_000002_create_users_table',1),(4,'2024_01_01_000003_create_tasks_table',1),(5,'2024_01_01_000004_create_task_comments_table',1),(6,'2024_01_01_000005_create_notifications_table',1),(7,'2024_01_01_000006_create_comment_mentions_table',1),(8,'2024_01_01_000007_create_comment_attachments_table',1),(9,'2024_01_01_000008_create_task_activities_table',1),(10,'2024_01_01_000009_create_time_entries_table',1),(11,'2024_01_01_000010_create_task_watchers_table',1),(12,'2024_01_01_000011_create_task_tags_table',1),(13,'2024_01_01_000012_create_task_tag_assignments_table',1),(14,'2024_01_01_000013_create_time_tracking_settings_table',1),(15,'2024_01_01_000014_create_task_attachments_table',1),(16,'2024_01_01_000015_create_task_templates_table',1),(17,'2025_12_09_045018_create_task_links_table',2),(18,'2024_01_01_000012_create_password_reset_tokens_table',3),(19,'2025_12_23_062006_add_notification_preferences_to_users_table',4);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `triggered_by_id` bigint(20) unsigned DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `task_id` bigint(20) unsigned DEFAULT NULL,
  `read_status` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_user_id_index` (`user_id`),
  KEY `notifications_type_index` (`type`),
  KEY `notifications_task_id_index` (`task_id`),
  KEY `notifications_triggered_by_id_index` (`triggered_by_id`),
  KEY `notifications_read_status_index` (`read_status`),
  KEY `notifications_created_at_index` (`created_at`),
  CONSTRAINT `notifications_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_triggered_by_id_foreign` FOREIGN KEY (`triggered_by_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (8,7,1,'registration_approved','Registration Approved','Your registration has been approved. You can now login to the system.',NULL,1,'2025-12-08 23:57:45','2025-12-09 00:09:34'),(12,9,11,'new_registration','New User Registration','Himantha Perera has registered and is awaiting approval.',NULL,0,'2025-12-19 05:26:43','2025-12-19 05:26:43'),(13,11,1,'registration_approved','Registration Approved','Your registration has been approved. You can now login to the system.',NULL,1,'2025-12-19 05:27:40','2025-12-19 05:28:53');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
INSERT INTO `password_reset_tokens` VALUES ('www.lisurasigera@gmail.com','$2y$12$dOJSn9XRVucIqgpPgXaJt.9Rx9U3uk0wjmesIuL0VzTemb4I08RWy','2025-12-23 00:32:00');
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
INSERT INTO `personal_access_tokens` VALUES (1,'App\\Models\\User',1,'auth-token','b1283c4b424bc3ace630092052b2dd86ad6d1abfad268c839dbabb34e1acaff7','[\"*\"]',NULL,NULL,'2025-12-07 09:43:40','2025-12-07 09:43:40'),(2,'App\\Models\\User',1,'auth-token','ce16eca428bd8f9dd1058f7d25482dc73e457b96472589d8861f4b7799e39427','[\"*\"]',NULL,NULL,'2025-12-07 09:52:45','2025-12-07 09:52:45'),(3,'App\\Models\\User',1,'auth-token','a5178ac5f5812b91e86198e6d3df803b857e4679f90551ebede76e52ea5a75ba','[\"*\"]',NULL,NULL,'2025-12-07 09:54:53','2025-12-07 09:54:53'),(4,'App\\Models\\User',1,'auth-token','da057ac113d27636ff07d915d69b10da5d045339f23902586773b2f9718790f0','[\"*\"]',NULL,NULL,'2025-12-07 09:56:23','2025-12-07 09:56:23'),(5,'App\\Models\\User',1,'auth-token','c65ed0fc081ee768b1be34ef7d6cf0a6e108900e7e27532972fa819d7ccc24af','[\"*\"]',NULL,NULL,'2025-12-07 09:58:38','2025-12-07 09:58:38'),(6,'App\\Models\\User',1,'auth-token','0004c6b5df35edf07d62e33337dea122dc4d8e1beb29769c14bf622a36d63b6f','[\"*\"]',NULL,NULL,'2025-12-07 09:59:25','2025-12-07 09:59:25'),(7,'App\\Models\\User',1,'auth-token','51e75f6aba263e4aa59481eb680eccad15e1b5298e2e69905d87086706a00d7a','[\"*\"]','2025-12-07 10:03:39',NULL,'2025-12-07 09:59:51','2025-12-07 10:03:39'),(8,'App\\Models\\User',1,'auth-token','17a63951a2749f7226d98a492fc45bec8648c2af5eac8437a1760b8d56494851','[\"*\"]','2025-12-07 22:38:36',NULL,'2025-12-07 10:07:28','2025-12-07 22:38:36'),(9,'App\\Models\\User',6,'auth-token','0e2875f6f331b373b8dc3fc586c4beaeb2db1415fb3f5ef29dfae6c264983b92','[\"*\"]','2025-12-07 22:39:49',NULL,'2025-12-07 22:39:04','2025-12-07 22:39:49'),(10,'App\\Models\\User',3,'auth-token','f6b621558dcdb81804e83aa9d0d4a6b17c97078e836a22ca9211b1b361b6050e','[\"*\"]','2025-12-07 23:11:50',NULL,'2025-12-07 22:40:01','2025-12-07 23:11:50'),(11,'App\\Models\\User',1,'test-token','213ca02e71a9f77a521d0c02ec42ff5c83ed6c4b4144d85a6fb2391abec63698','[\"*\"]','2025-12-07 23:14:51',NULL,'2025-12-07 23:11:04','2025-12-07 23:14:51'),(12,'App\\Models\\User',3,'auth-token','8386142bfa24e5c446591ac6af62047ae7bf432e01a84fe54c3e9503d21e2789','[\"*\"]','2025-12-08 11:28:07',NULL,'2025-12-08 11:23:09','2025-12-08 11:28:07'),(13,'App\\Models\\User',6,'auth-token','ff0647419a2d8f462a461674ec5fe8e9dd95e256c6529f840751993a62d86e34','[\"*\"]','2025-12-08 11:33:15',NULL,'2025-12-08 11:28:27','2025-12-08 11:33:15'),(14,'App\\Models\\User',6,'auth-token','17fa9f3616dd07617c4ec1dbd78c098db06140dd8cb492b2731d6df440f79589','[\"*\"]','2025-12-08 22:14:31',NULL,'2025-12-08 22:09:42','2025-12-08 22:14:31'),(15,'App\\Models\\User',3,'auth-token','1cbd522c34f6a2e54cdec64e02b1681117039cd25276613193b7e563d98320a7','[\"*\"]','2025-12-08 22:23:07',NULL,'2025-12-08 22:14:57','2025-12-08 22:23:07'),(16,'App\\Models\\User',6,'auth-token','5e34495e9c535688a89599935179b5d68ad7eaa173ca802cbf0670533e56f39c','[\"*\"]','2025-12-08 22:23:59',NULL,'2025-12-08 22:23:29','2025-12-08 22:23:59'),(17,'App\\Models\\User',1,'auth-token','d11552707e5396a2b3c53cee01332b9da0fd802f2caa5e37745cac40d1a5f90b','[\"*\"]','2025-12-08 22:37:21',NULL,'2025-12-08 22:24:20','2025-12-08 22:37:21'),(18,'App\\Models\\User',6,'auth-token','6daffb1079983b17b6fa2cecdf212d7285c59e105f689ba65412bc226e9a04e4','[\"*\"]','2025-12-08 22:43:26',NULL,'2025-12-08 22:37:43','2025-12-08 22:43:26'),(19,'App\\Models\\User',3,'auth-token','7c049b5d7173d71bcd4ff3321bd12ddbe576b007267704161b4d6a36c3725b3c','[\"*\"]','2025-12-08 23:32:28',NULL,'2025-12-08 22:43:51','2025-12-08 23:32:28'),(20,'App\\Models\\User',1,'auth-token','60bdf187bcd5a8f27ecf7680df410c91bbcdeed3215123b64c7f9d5b2e36a00f','[\"*\"]','2025-12-09 00:08:57',NULL,'2025-12-08 23:44:51','2025-12-09 00:08:57'),(21,'App\\Models\\User',7,'auth-token','3152cdcd7f111d680bc7ceba4b436606dcd9df2202b37c7e9b4c68981e1526aa','[\"*\"]','2025-12-09 03:14:09',NULL,'2025-12-09 00:09:19','2025-12-09 03:14:09'),(22,'App\\Models\\User',1,'auth-token','7642c5ae1996ae44eff252cba2436064471cdc6aae1690a9507b17d5a4dbed32','[\"*\"]','2025-12-09 03:34:00',NULL,'2025-12-09 03:15:57','2025-12-09 03:34:00'),(23,'App\\Models\\User',3,'auth-token','912286713b117a250f4f8f7ed66dcb6ef6d1a7c5c88ca3934ec482803cc65915','[\"*\"]','2025-12-09 03:50:48',NULL,'2025-12-09 03:34:31','2025-12-09 03:50:48'),(24,'App\\Models\\User',2,'auth-token','8327dcd570f8fa080964b60eea24ef0c5ccb4161cc11b0c4355ce272c4b16fec','[\"*\"]','2025-12-09 03:52:27',NULL,'2025-12-09 03:51:19','2025-12-09 03:52:27'),(25,'App\\Models\\User',3,'auth-token','b7de3e901c6622c85c650c50c9ac2dfa9afa3fb559bab33db19b320ce7896eae','[\"*\"]','2025-12-09 03:56:53',NULL,'2025-12-09 03:52:50','2025-12-09 03:56:53'),(26,'App\\Models\\User',2,'auth-token','17d504f9b4f56ecdd65d24b6ac61ebb5e67e0d1c4a355114e0a43dbd20a4490c','[\"*\"]','2025-12-09 03:58:59',NULL,'2025-12-09 03:57:13','2025-12-09 03:58:59'),(27,'App\\Models\\User',6,'auth-token','bb42ea83e5bb5951374c868969a1d5f4068a60d082ea74068b59ab353f09d22c','[\"*\"]','2025-12-09 22:12:36',NULL,'2025-12-09 03:59:31','2025-12-09 22:12:36'),(28,'App\\Models\\User',3,'auth-token','0dac3f4640ac0a4e5495ea89952e34354063aea0766ecf44aeaed1c34f420c7c','[\"*\"]','2025-12-09 22:33:06',NULL,'2025-12-09 22:12:57','2025-12-09 22:33:06'),(29,'App\\Models\\User',1,'auth-token','55da66f20fc659778f8ff1a48c0832ddf56c3175ba2ecf42d079192894560ae1','[\"*\"]','2025-12-10 22:12:20',NULL,'2025-12-09 22:33:28','2025-12-10 22:12:20'),(30,'App\\Models\\User',6,'auth-token','fdf03914241a2807cd22b6f9e30ac2e64e04532d6b0ce3622bd05ff2614106b9','[\"*\"]','2025-12-10 22:16:41',NULL,'2025-12-10 22:12:43','2025-12-10 22:16:41'),(31,'App\\Models\\User',6,'auth-token','52d04c605cdf44855b2280f40b31b36f88c868be2c74a4e864dfe072b1eb6852','[\"*\"]','2025-12-10 22:17:36',NULL,'2025-12-10 22:17:05','2025-12-10 22:17:36'),(32,'App\\Models\\User',3,'auth-token','35a2161fc0d265cc46a31fd95b592d458f8c2e3dc690132582ab389210f7555a','[\"*\"]','2025-12-10 22:18:43',NULL,'2025-12-10 22:17:58','2025-12-10 22:18:43'),(33,'App\\Models\\User',6,'auth-token','67081e94459076442d4761b4648d6092fe5647f893d7790d33bd920a00559d1c','[\"*\"]','2025-12-10 22:46:22',NULL,'2025-12-10 22:19:03','2025-12-10 22:46:22'),(34,'App\\Models\\User',3,'auth-token','d4e9363a15c34a0de1631a08ea4e136162b3cbfcf7d068b2969fff0919dcc942','[\"*\"]','2025-12-10 22:47:20',NULL,'2025-12-10 22:46:45','2025-12-10 22:47:20'),(35,'App\\Models\\User',1,'auth-token','b398ee65a23cf0f415c7cdba259e1530f104dc05cc0b230273ee770abb608507','[\"*\"]','2025-12-10 23:03:55',NULL,'2025-12-10 22:47:40','2025-12-10 23:03:55'),(36,'App\\Models\\User',6,'auth-token','7be6a770264fd0087f32dd07299374a5331a0fe5cc2b045ac1dc14d74599639d','[\"*\"]','2025-12-14 22:19:57',NULL,'2025-12-14 22:16:42','2025-12-14 22:19:57'),(37,'App\\Models\\User',3,'auth-token','2166ee1e82bfbab44da01b7d891e8c32b4a223c225aee6c58bad9442a1a60de5','[\"*\"]','2025-12-14 22:20:31',NULL,'2025-12-14 22:20:15','2025-12-14 22:20:31'),(38,'App\\Models\\User',1,'auth-token','7fa7617b3d3cfe3c4386cffada58cd5b51bbafd5aaa63c3f294b864d1f225564','[\"*\"]','2025-12-14 22:24:19',NULL,'2025-12-14 22:20:58','2025-12-14 22:24:19'),(39,'App\\Models\\User',6,'auth-token','aca88e5d5aebcc9e4c0ff96e277cf39024f463b5bd2adef9430876428115c791','[\"*\"]','2025-12-14 22:25:56',NULL,'2025-12-14 22:24:56','2025-12-14 22:25:56'),(40,'App\\Models\\User',10,'auth-token','be062fb2a75e58a51825b3747b4b20b493413af541746b1cf3bfcf05e3efbf5a','[\"*\"]',NULL,NULL,'2025-12-14 23:55:45','2025-12-14 23:55:45'),(41,'App\\Models\\User',1,'auth-token','74dca5749f9495641af93c4ff00ce2b4c992ae11182cfdf302cf2a0c20b16884','[\"*\"]','2025-12-14 23:57:36',NULL,'2025-12-14 23:56:21','2025-12-14 23:57:36'),(42,'App\\Models\\User',9,'auth-token','995f38812e113c087997e64a308f47f78bd1fa41b6f743dddace24a72b9035ac','[\"*\"]','2025-12-19 04:30:48',NULL,'2025-12-15 00:07:57','2025-12-19 04:30:48'),(43,'App\\Models\\User',1,'auth-token','96aebbf363090038c5346e65a58293ea985a9a7bf3c7467920ac8a963da177e5','[\"*\"]','2025-12-19 04:39:31',NULL,'2025-12-19 04:31:16','2025-12-19 04:39:31'),(44,'App\\Models\\User',10,'auth-token','a7cfe6832462b3249c1fddaa70d34d58d7decd806b23861f1fbc68f86e0a0902','[\"*\"]','2025-12-19 05:22:56',NULL,'2025-12-19 04:40:04','2025-12-19 05:22:56'),(45,'App\\Models\\User',1,'auth-token','0c905367a5e4b0d718a9effcec76f1b65aae8e94cb0b7647dedc0e405b5e8ce5','[\"*\"]','2025-12-19 05:27:45',NULL,'2025-12-19 05:27:12','2025-12-19 05:27:45'),(46,'App\\Models\\User',11,'auth-token','32cfba25392e272196496c5d83eb12843b1c734655aec53afc579f9ed4df8496','[\"*\"]','2025-12-19 05:30:12',NULL,'2025-12-19 05:28:41','2025-12-19 05:30:12'),(47,'App\\Models\\User',1,'auth-token','55e4de89ba23855af96ba2e43796e2e80c600c03bfc7699365e4baa48f0616ad','[\"*\"]','2025-12-19 05:30:48',NULL,'2025-12-19 05:30:30','2025-12-19 05:30:48'),(48,'App\\Models\\User',11,'auth-token','1e147b5e064f6d9fd7b49f93759910943636f0b1aa3c2ba2136bd8744061a062','[\"*\"]','2025-12-19 05:56:48',NULL,'2025-12-19 05:30:55','2025-12-19 05:56:48'),(49,'App\\Models\\User',10,'auth-token','e167b67e7ff7bfbb5bac9a835d0008e9181142f4445b3ad747a30336d062a72e','[\"*\"]','2025-12-19 07:00:39',NULL,'2025-12-19 05:57:18','2025-12-19 07:00:39'),(50,'App\\Models\\User',1,'auth-token','19a809374b506e6095d52c42a47530913ca1a694ff4059e9abde911feddaa44d','[\"*\"]','2025-12-21 22:52:17',NULL,'2025-12-21 22:47:01','2025-12-21 22:52:17'),(51,'App\\Models\\User',1,'auth-token','98a121b43c80d3b0de7042f774e0a600e55acf9bf5bb2689c20efc5d203ef296','[\"*\"]','2025-12-21 22:52:28',NULL,'2025-12-21 22:52:27','2025-12-21 22:52:28'),(52,'App\\Models\\User',1,'auth-token','ac87b445a4fb735ee9818f0415af1ea09d37507edb640ee72cdc04c42975134b','[\"*\"]','2025-12-21 22:54:21',NULL,'2025-12-21 22:53:04','2025-12-21 22:54:21'),(53,'App\\Models\\User',1,'auth-token','a33cd54d017536082f49cb48b3cb54e935084295f5fe374d72f3b6b5c21e3b72','[\"*\"]','2025-12-21 22:55:16',NULL,'2025-12-21 22:54:35','2025-12-21 22:55:16'),(54,'App\\Models\\User',1,'auth-token','df7b0f0f1ce5e01ba162b3e247f00395ae27c1fec98abafb03a6935aa524cc00','[\"*\"]','2025-12-21 23:07:16',NULL,'2025-12-21 22:55:45','2025-12-21 23:07:16'),(55,'App\\Models\\User',1,'auth-token','70865be263fd4e523e8ade3acae8a88b08f39d68c576dc4c5549f26fa409003f','[\"*\"]','2025-12-23 00:27:57',NULL,'2025-12-21 23:08:22','2025-12-23 00:27:57'),(56,'App\\Models\\User',1,'auth-token','90cf6d19d0ac661d34ceadb226b56870c39e34b62483c454355540081865cfc6','[\"*\"]','2025-12-23 00:33:11',NULL,'2025-12-23 00:32:25','2025-12-23 00:33:11'),(57,'App\\Models\\User',1,'auth-token','7ca925ff26a98c0c812660b3a9ff4d1fb0338a19d4aad9d76d0798e3c018c178','[\"*\"]','2025-12-23 00:33:22',NULL,'2025-12-23 00:33:21','2025-12-23 00:33:22'),(58,'App\\Models\\User',1,'auth-token','52f916e2ed00b61ce6a5802a5565569e47bbcfec3fa64bac8a9a733ff8a6455a','[\"*\"]','2025-12-23 05:50:09',NULL,'2025-12-23 00:40:16','2025-12-23 05:50:09');
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_activities`
--

DROP TABLE IF EXISTS `task_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_activities` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `activity_type` enum('task_created','status_changed','progress_updated','assignment_changed','due_date_changed','priority_changed','department_changed','comment_added','file_uploaded','file_deleted','link_added','link_removed','task_edited','user_mentioned','task_completed','task_reopened','task_deleted','task_archived','watcher_added','watcher_removed','tag_added','tag_removed','time_logged','timer_started','timer_stopped') NOT NULL,
  `description` text NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Stores activity-specific data like old/new values' CHECK (json_valid(`metadata`)),
  `is_system_generated` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `task_activities_task_id_index` (`task_id`),
  KEY `task_activities_user_id_index` (`user_id`),
  KEY `task_activities_activity_type_index` (`activity_type`),
  KEY `task_activities_created_at_index` (`created_at`),
  CONSTRAINT `task_activities_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_activities_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_activities`
--

LOCK TABLES `task_activities` WRITE;
/*!40000 ALTER TABLE `task_activities` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_attachments`
--

DROP TABLE IF EXISTS `task_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_attachments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) unsigned NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_url` varchar(255) NOT NULL,
  `file_size` int(11) DEFAULT NULL,
  `uploaded_by` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `task_attachments_uploaded_by_foreign` (`uploaded_by`),
  KEY `task_attachments_task_id_index` (`task_id`),
  CONSTRAINT `task_attachments_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_attachments_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_attachments`
--

LOCK TABLES `task_attachments` WRITE;
/*!40000 ALTER TABLE `task_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_comments`
--

DROP TABLE IF EXISTS `task_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_comments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `parent_comment_id` bigint(20) unsigned DEFAULT NULL,
  `comment` text NOT NULL,
  `edited_at` timestamp NULL DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `task_comments_task_id_index` (`task_id`),
  KEY `task_comments_user_id_index` (`user_id`),
  KEY `task_comments_parent_comment_id_index` (`parent_comment_id`),
  KEY `task_comments_created_at_index` (`created_at`),
  CONSTRAINT `task_comments_parent_comment_id_foreign` FOREIGN KEY (`parent_comment_id`) REFERENCES `task_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_comments_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_comments`
--

LOCK TABLES `task_comments` WRITE;
/*!40000 ALTER TABLE `task_comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_links`
--

DROP TABLE IF EXISTS `task_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_links` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) unsigned NOT NULL,
  `added_by` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `url` text NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `task_links_task_id_foreign` (`task_id`),
  KEY `task_links_added_by_foreign` (`added_by`),
  CONSTRAINT `task_links_added_by_foreign` FOREIGN KEY (`added_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_links_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_links`
--

LOCK TABLES `task_links` WRITE;
/*!40000 ALTER TABLE `task_links` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_links` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_tag_assignments`
--

DROP TABLE IF EXISTS `task_tag_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_tag_assignments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) unsigned NOT NULL,
  `tag_id` bigint(20) unsigned NOT NULL,
  `assigned_by` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_task_tag` (`task_id`,`tag_id`),
  KEY `task_tag_assignments_assigned_by_foreign` (`assigned_by`),
  KEY `task_tag_assignments_task_id_index` (`task_id`),
  KEY `task_tag_assignments_tag_id_index` (`tag_id`),
  CONSTRAINT `task_tag_assignments_assigned_by_foreign` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_tag_assignments_tag_id_foreign` FOREIGN KEY (`tag_id`) REFERENCES `task_tags` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_tag_assignments_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_tag_assignments`
--

LOCK TABLES `task_tag_assignments` WRITE;
/*!40000 ALTER TABLE `task_tag_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_tag_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_tags`
--

DROP TABLE IF EXISTS `task_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_tags` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `color` varchar(7) NOT NULL DEFAULT '#3B82F6' COMMENT 'Hex color code',
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `created_by` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tag_name_dept` (`name`,`department_id`),
  KEY `task_tags_created_by_foreign` (`created_by`),
  KEY `task_tags_department_id_index` (`department_id`),
  CONSTRAINT `task_tags_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_tags_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_tags`
--

LOCK TABLES `task_tags` WRITE;
/*!40000 ALTER TABLE `task_tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_templates`
--

DROP TABLE IF EXISTS `task_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_templates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `department_id` bigint(20) unsigned NOT NULL,
  `template_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `default_priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `estimated_hours` decimal(6,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `task_templates_department_id_index` (`department_id`),
  CONSTRAINT `task_templates_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_templates`
--

LOCK TABLES `task_templates` WRITE;
/*!40000 ALTER TABLE `task_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_watchers`
--

DROP TABLE IF EXISTS `task_watchers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_watchers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `added_by` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_task_watcher` (`task_id`,`user_id`),
  KEY `task_watchers_added_by_foreign` (`added_by`),
  KEY `task_watchers_task_id_index` (`task_id`),
  KEY `task_watchers_user_id_index` (`user_id`),
  CONSTRAINT `task_watchers_added_by_foreign` FOREIGN KEY (`added_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_watchers_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_watchers_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_watchers`
--

LOCK TABLES `task_watchers` WRITE;
/*!40000 ALTER TABLE `task_watchers` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_watchers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tasks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `department` varchar(100) NOT NULL,
  `assigned_to_id` bigint(20) unsigned DEFAULT NULL,
  `created_by_id` bigint(20) unsigned NOT NULL,
  `priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `status` enum('todo','in-progress','completed','on-hold') NOT NULL DEFAULT 'todo',
  `progress` int(10) unsigned NOT NULL DEFAULT 0,
  `due_date` date DEFAULT NULL,
  `estimated_hours` decimal(6,2) DEFAULT NULL COMMENT 'Estimated time to complete in hours',
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `archived_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tasks_department_index` (`department`),
  KEY `tasks_assigned_to_id_index` (`assigned_to_id`),
  KEY `tasks_created_by_id_index` (`created_by_id`),
  KEY `tasks_priority_index` (`priority`),
  KEY `tasks_status_index` (`status`),
  KEY `tasks_due_date_index` (`due_date`),
  KEY `tasks_created_at_index` (`created_at`),
  KEY `tasks_updated_at_index` (`updated_at`),
  CONSTRAINT `tasks_assigned_to_id_foreign` FOREIGN KEY (`assigned_to_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tasks_created_by_id_foreign` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `time_entries`
--

DROP TABLE IF EXISTS `time_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `time_entries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `duration_minutes` int(11) DEFAULT NULL COMMENT 'Calculated duration in minutes',
  `description` text DEFAULT NULL,
  `category` enum('development','testing','documentation','design','meeting','review','deployment','planning','other') NOT NULL DEFAULT 'other',
  `is_billable` tinyint(1) NOT NULL DEFAULT 0,
  `is_manual_entry` tinyint(1) NOT NULL DEFAULT 1,
  `is_running` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'TRUE if timer is currently active',
  `edited_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `time_entries_task_id_index` (`task_id`),
  KEY `time_entries_user_id_index` (`user_id`),
  KEY `time_entries_is_running_index` (`is_running`),
  KEY `time_entries_start_time_index` (`start_time`),
  KEY `time_entries_is_billable_index` (`is_billable`),
  CONSTRAINT `time_entries_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `time_entries_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `time_entries`
--

LOCK TABLES `time_entries` WRITE;
/*!40000 ALTER TABLE `time_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `time_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `time_tracking_settings`
--

DROP TABLE IF EXISTS `time_tracking_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `time_tracking_settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `auto_start_timer` tinyint(1) NOT NULL DEFAULT 0,
  `reminder_interval_minutes` int(11) NOT NULL DEFAULT 60 COMMENT 'Reminder frequency for time logging',
  `allow_edit_window_hours` int(11) NOT NULL DEFAULT 24 COMMENT 'Hours within which time entries can be edited',
  `require_description` tinyint(1) NOT NULL DEFAULT 1,
  `default_category` varchar(50) NOT NULL DEFAULT 'other',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `time_tracking_settings_user_id_index` (`user_id`),
  KEY `time_tracking_settings_department_id_index` (`department_id`),
  CONSTRAINT `time_tracking_settings_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `time_tracking_settings_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `time_tracking_settings`
--

LOCK TABLES `time_tracking_settings` WRITE;
/*!40000 ALTER TABLE `time_tracking_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `time_tracking_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('super_admin','dept_admin','employee') NOT NULL DEFAULT 'employee',
  `department` varchar(100) NOT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `managed_department_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of department IDs managed by dept_admin' CHECK (json_valid(`managed_department_ids`)),
  `profile_picture` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `status` enum('pending','active','inactive') NOT NULL DEFAULT 'pending',
  `email_notifications` tinyint(1) NOT NULL DEFAULT 1,
  `task_reminders` tinyint(1) NOT NULL DEFAULT 1,
  `comment_notifications` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_unique` (`username`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_email_index` (`email`),
  KEY `users_role_index` (`role`),
  KEY `users_department_id_index` (`department_id`),
  KEY `users_status_index` (`status`),
  CONSTRAINT `users_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Super Administrator','admin','admin@taskmanagement.com','$2y$12$4JNaB6FGSKapQRI13srGvO61XDgjUa.eoCW9ETRjmwMsd6x5Gli8.','super_admin','IT',10,NULL,NULL,'0740783171','active',1,1,0,'2025-12-07 09:26:21','2025-12-23 00:52:19'),(7,'Lisura Sigera','Lisura','www.lisurasigera@gmail.com','$2y$12$iawVI2ZCycxe.QQlVupVLu0f9IMEsd8XTOCGicXefCqlfMSdeOw6K','employee','IT',10,NULL,NULL,NULL,'active',1,1,1,'2025-12-08 23:43:41','2025-12-09 00:08:57'),(9,'S_Admin','s_admin','admin@clktask.com','$2y$12$RotEdjy1jfgOTra8uM9zKOYXKPig2jk5cNmYJDxN8mTIifx.QOxFe','super_admin','Administration',NULL,NULL,NULL,NULL,'active',1,1,1,'2025-12-14 23:03:42','2025-12-15 00:07:21'),(10,'Kasun Tharaka','Kasun','kasun@gmail.com','$2y$12$edDIT4iDO6pUyxs3ChPwNeEFREKzXUwNJ/pX9u6Yh8T/86zDv01vS','dept_admin','Design and Marketing',2,NULL,NULL,'0740783171','active',1,1,1,'2025-12-14 23:54:18','2025-12-14 23:54:18'),(11,'Himantha Perera','Himantha','himantha@gmail.com','$2y$12$JzVH0e.Ud/mSmBELLzhDM.F8jeBTW8lN6irJkfzamQxMlJyIvfCR6','dept_admin','Sales',1,NULL,NULL,NULL,'active',1,1,1,'2025-12-19 05:26:43','2025-12-19 05:30:48');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-23 16:50:59
