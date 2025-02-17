// MATCH (n)
// OPTIONAL MATCH (n)-[r]-()
// DELETE n,r

CREATE (OdinAcademy:External {title:'OdinAcademy', type:'api', owner:'external'})
CREATE (ThorCertify:External {title:'ThorCertify', type:'api', owner:'external'})
CREATE (LokiLibrary:External {title:'LokiLibrary', type:'api', owner:'external'})
CREATE (FreyaCourses:External {title:'FreyaCourses', type:'api', owner:'external'})
CREATE (HeimdallAccess:External {title:'HeimdallAccess', type:'api', owner:'external'})
CREATE (TyrMentor:External {title:'TyrMentor', type:'api', owner:'external'})
CREATE (SkadiHub:External {title:'SkadiHub', type:'api', owner:'external'})
CREATE (Calleer:External {title:'Calleer', type:'api', owner:'external'})
CREATE (Trader:External {title:'Trader', type:'api', owner:'external'})

CREATE (Postgres:Infra {title:'Postgres', type:'database', owner:'AWS'})
CREATE (MariaDB:Infra {title:'Mariadb', type:'database', owner:'AWS'})
CREATE (Redis:Infra {title:'Redis', type:'database', owner:'AWS'})

CREATE (Starhigh:API {title:'Starhigh', type:'api', owner:'ewacademy'})
CREATE (Distributor:API {title:'Distributor', type:'api', owner:'ewacademy'})
CREATE (FenrirPortal:API {title:'FenrirPortal', type:'api', owner:'ewacademy'})
CREATE (Mjolnir:API {title:'Mjolnir', type:'api', owner:'ewacademy'})
CREATE (PayNow:API {title:'PayNow', type:'api', owner:'ewacademy'})
CREATE (Dogbot:API {title:'Dogbot', type:'api', owner:'ewacademy'})
CREATE (BifrostEnrollment:API {title:'BifrostEnrollment', type:'api', owner:'ewacademy'})
CREATE (MoonSchedule:API {title:'MoonSchedule', type:'api', owner:'ewacademy'})
CREATE (JotunAdmin:API {title:'FinancialInstitution', type:'api', owner:'ewacademy'})
CREATE (Runner:API {title:'Runner', type:'api', owner:'ewacademy'})

CREATE (ProcessorCron:Job {title:'Distributor', type:'cron', owner:'ewacademy'})
CREATE (WarCron:Job {title:'Financial institution', type:'cron', owner:'ewacademy'})
CREATE (Yggdrasil:Job {title:'Yggdrasil', type:'cron', owner:'ewacademy'})
CREATE (PayerStar:Job {title:'Financial institution cron', type:'cron', owner:'ewacademy'})
CREATE (ThorUltron:Job {title:'Bee ultron', type:'cron', owner:'ewacademy'})
CREATE (FenrirTrading:Job {title:'Bee trading enfoque', type:'cron', owner:'ewacademy'})
CREATE (Sleipnir:Job {title:'Wall-e', type:'cron', owner:'ewacademy'})
CREATE (AcademyMegatron:Job {title:'AcademyMegatron', type:'cron', owner:'ewacademy'})

// <API>
CREATE
  (FenrirPortal)-[:CALLED_IN {roles:['authentication', 'transaction', 'customer']}]->(JotunAdmin),
  (OdinAcademy)-[:CALLED_IN {roles:['create customer', 'retrieve customer']}]->(JotunAdmin),
  (ThorCertify)-[:CALLED_IN {roles:['create PF', 'exchange contract PF']}]->(JotunAdmin),
  (MariaDB)-[:CALLED_IN {roles:['tbl_*']}]->(JotunAdmin)

CREATE
  (FenrirPortal)-[:CALLED_IN {roles:['authentication']}]->(Mjolnir),
  (FreyaCourses)-[:CALLED_IN {roles:['create customer', 'retrieve customer']}]->(Mjolnir),
  (LokiLibrary)-[:CALLED_IN {roles:['create PF', 'exchange contract PF']}]->(Mjolnir),
  (HeimdallAccess)-[:CALLED_IN {roles:['']}]->(Mjolnir),
  (TyrMentor)-[:CALLED_IN {roles:['']}]->(Mjolnir),
  (SkadiHub)-[:CALLED_IN {roles:['']}]->(Mjolnir),
  (BifrostEnrollment)-[:CALLED_IN {roles:['']}]->(Mjolnir),
  (MariaDB)-[:CALLED_IN {roles:['tbl_*']}]->(Mjolnir)

CREATE
  (FenrirPortal)-[:CALLED_IN {roles:['authentication']}]->(PayNow),
  (MoonSchedule)-[:CALLED_IN {roles:['get infos']}]->(PayNow),
  (MariaDB)-[:CALLED_IN {roles:['tbl_*']}]->(PayNow)

CREATE
  (FenrirPortal)-[:CALLED_IN {roles:['authentication']}]->(Dogbot),
  (Calleer)-[:CALLED_IN {roles:['post infos']}]->(Dogbot),
  (Starhigh)-[:CALLED_IN {roles:['get infos']}]->(Dogbot),
  (MariaDB)-[:CALLED_IN {roles:['tbl_*']}]->(Dogbot)
// </API>

//<Job>
CREATE
  (Redis)-[:CALLED_IN {roles:['']}]->(ProcessorCron),
  (Distributor)-[:CALLED_IN {roles:['']}]->(ProcessorCron),
  (HeimdallAccess)-[:CALLED_IN {roles:['get infos']}]->(ProcessorCron),
  (TyrMentor)-[:CALLED_IN {roles:['get infos']}]->(ProcessorCron),
  (SkadiHub)-[:CALLED_IN {roles:['get infos']}]->(ProcessorCron)


CREATE
  (Starhigh)-[:CALLED_IN {roles:['']}]->(WarCron),
  (FenrirPortal)-[:CALLED_IN {roles:['']}]->(WarCron),
  (MariaDB)-[:CALLED_IN {roles:['']}]->(WarCron)

CREATE
  (Starhigh)-[:CALLED_IN {roles:['']}]->(Yggdrasil),
  (MariaDB)-[:CALLED_IN {roles:['']}]->(Yggdrasil)

CREATE
  (Starhigh)-[:CALLED_IN {roles:['']}]->(PayerStar),
  (MariaDB)-[:CALLED_IN {roles:['']}]->(PayerStar)

CREATE
  (Starhigh)-[:CALLED_IN {roles:['']}]->(ThorUltron),
  (MariaDB)-[:CALLED_IN {roles:['']}]->(ThorUltron)

CREATE
  (Runner)-[:CALLED_IN {roles:['']}]->(FenrirTrading),
  (FenrirPortal)-[:CALLED_IN {roles:['authentication']}]->(FenrirTrading),
  (PayNow)-[:CALLED_IN {roles:['']}]->(FenrirTrading)


CREATE
  (Starhigh)-[:CALLED_IN {roles:['']}]->(Sleipnir),
  (MariaDB)-[:CALLED_IN {roles:['authentication']}]->(Sleipnir),
  (FenrirPortal)-[:CALLED_IN {roles:['']}]->(Sleipnir)

CREATE
  (FenrirTrading)-[:CALLED_IN {roles:['']}]->(AcademyMegatron),
  (MariaDB)-[:CALLED_IN {roles:['authentication']}]->(AcademyMegatron),
  (PayNow)-[:CALLED_IN {roles:['']}]->(AcademyMegatron)

// MATCH p=()-[r:CALLED_IN]->() RETURN p;