<template>
  <div>
    <el-form label-position="right" label-width="150px" :model="writerForm" :rules="rules">
      <el-form-item label="数据库源：" prop="datasourceId">
        <el-select
          v-model="writerForm.datasourceId"
          filterable
          style="width: 300px;"
          @change="wDsChange"
        >
          <el-option
            v-for="item in wDsList"
            :key="item.id"
            :label="item.datasourceName"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-show="dataSource==='postgresql' || dataSource==='oracle' ||dataSource==='sqlserver'" label="Schema：" prop="tableSchema">
        <el-select v-model="writerForm.tableSchema" filterable style="width: 300px" @change="schemaChange">
          <el-option
            v-for="item in schemaList"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="数据库表名：" prop="tableName">
        <el-select
          v-model="fromTableName"
          allow-create
          default-first-option
          filterable
          :disabled="writerForm.ifCreateTable"
          style="width: 300px"
          @change="wTbChange"
        >
          <el-option
            v-for="item in wTbList"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
        <el-input v-show="writerForm.ifCreateTable" v-model="writerForm.tableName" style="width: 200px;" :placeholder="readerForm.tableName" />
        <!-- <el-input v-model="createTableName" style="width: 195px" /> -->
        <!-- <el-button type="primary" @click="createTable">新增</el-button> -->
        <el-button v-if="dataSource === 'clickhouse'" type="primary" @click="createNewTable">自动同步</el-button>
      </el-form-item>
      <div style="margin: 5px 0;" />
      <el-form-item label="字段：">
        <el-checkbox v-model="writerForm.checkAll" :indeterminate="writerForm.isIndeterminate" @change="wHandleCheckAllChange">全选</el-checkbox>
        <div style="margin: 15px 0;" />
        <el-checkbox-group v-model="writerForm.columns" @change="wHandleCheckedChange">
          <el-checkbox v-for="c in fromColumnList" :key="c" :label="c">{{ c }}</el-checkbox>
        </el-checkbox-group>
      </el-form-item>
      <el-form-item label="前置sql语句：">
        <el-input v-model="writerForm.preSql" placeholder="前置sql在insert之前执行" type="textarea" style="width: 42%" />
      </el-form-item>
      <el-form-item label="postSql">
        <el-input v-model="writerForm.postSql" placeholder="多个用;分隔" type="textarea" style="width: 42%" />
      </el-form-item>
    </el-form>

    <el-dialog
      title="自动同步"
      :visible.sync="isNewTable"
      width="600px"
    >
      <el-form label-position="right" label-width="150px">
        <el-form-item label="源数据库：">
          <el-select
            v-model="newCreateForm.srcDatasourceId"
            filterable
            style="width: 300px;"
            disabled
          >
            <el-option
              v-for="item in originTableNames.rDsList"
              :key="item.id"
              :label="item.datasourceName"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目标数据库：">
          <el-select
            v-model="newCreateForm.desDatasourceId"
            filterable
            style="width: 300px;"
            disabled
          >
            <el-option
              v-for="item in wDsList"
              :key="item.id"
              :label="item.datasourceName"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="同步所有表：" style="margin-right: 110px">
          <el-switch
            v-model="newCreateForm.syncAllTables"
            active-text="是"
            inactive-text="否"
          />
        </el-form-item>
        <template v-if="!isSyncAll">
          <el-form-item label="表名称：" style="margin-right: 110px">
            <el-input v-model="newCreateForm.tableName" disabled />
          </el-form-item>
          <el-form-item v-if="originColumnList.length" label="表字段：">
            <!-- <el-checkbox
                v-model="readerForm.checkAll"
                :indeterminate="readerForm.isIndeterminate"
                @change="rHandleCheckAllChange"
              >全选
              </el-checkbox> -->
            <div style="margin: 15px 0; max-height: 100px; overflow: auto;">
              <el-checkbox-group v-model="newCreateForm.columns" disabled>
                <el-checkbox v-for="c in originColumnList" :key="c" :label="c">{{ c }}</el-checkbox>
              </el-checkbox-group>
            </div>
          </el-form-item>
        </template>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="isNewTable = false;">取消</el-button>
        <el-button type="primary" @click="createTable">同步</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import * as dsQueryApi from '@/api/metadata-query'
import { list as jdbcDsList } from '@/api/datax-jdbcDatasource'
import Bus from '../busWriter'
export default {
  name: 'RDBMSWriter',
  data() {
    return {
      jdbcDsQuery: {
        current: 1,
        size: 200,
        ascs: 'datasource_name'
      },
      wDsList: [],
      schemaList: [],
      fromTableName: '',
      fromColumnList: [],
      wTbList: [],
      dataSource: '',
      createTableName: '',
      writerForm: {
        datasourceId: undefined,
        tableName: '',
        columns: [],
        checkAll: false,
        isIndeterminate: true,
        preSql: '',
        postSql: '',
        ifCreateTable: false,
        tableSchema: ''
      },
      readerForm: this.getReaderData(),
      rules: {
        datasourceId: [{ required: true, message: 'this is required', trigger: 'change' }],
        tableName: [{ required: true, message: 'this is required', trigger: 'change' }],
        tableSchema: [{ required: true, message: 'this is required', trigger: 'change' }]
      },
      isNewTable: false,
      originTableNames: {
        datasourceId: ''
      },
      originTableName: '',
      originColumnList: [],
      newCreateForm: {
        srcDatasourceId: '',
        desDatasourceId: '',
        tableName: '',
        columns: [],
        syncAllTables: 0
      }
    }
  },
  computed: {
    isSyncAll() {
      return !!this.newCreateForm.syncAllTables
    }
  },
  watch: {
    'writerForm.datasourceId': function() {
      this.newCreateForm.desDatasourceId = this.writerForm.datasourceId
      if (this.dataSource === 'postgresql' || this.dataSource === 'oracle' || this.dataSource === 'sqlserver') {
        this.getSchema()
      } else {
        this.getTables('rdbmsWriter')
      }
    },
    'originTableName': function(oldVal, newVal) {
      this.newCreateForm.tableName = newVal || oldVal
    },
    'originTableNames.datasourceId': function() {
      this.newCreateForm.srcDatasourceId = this.originTableNames.datasourceId
    },
    'originColumnList': function(oldVal, newVal) {
      const arr = newVal.length > 0 ? newVal : oldVal
      this.newCreateForm.columns = arr
    }
  },
  created() {
    this.getJdbcDs()
  },
  methods: {
    createNewTable() {
      this.isNewTable = true
    },
    rHandleCheckAllChange(val) {
      this.readerForm.columns = val ? this.rColumnList : []
      this.readerForm.isIndeterminate = false
    },
    // 获取可用数据源
    getJdbcDs() {
      this.loading = true
      jdbcDsList(this.jdbcDsQuery).then(response => {
        const { records } = response
        this.wDsList = records
        this.loading = false
      })
    },
    // 获取表名
    getTables(type) {
      if (type === 'rdbmsWriter') {
        let obj = {}
        if (this.dataSource === 'postgresql' || this.dataSource === 'oracle' || this.dataSource === 'sqlserver') {
          obj = {
            datasourceId: this.writerForm.datasourceId,
            tableSchema: this.writerForm.tableSchema
          }
        } else {
          obj = {
            datasourceId: this.writerForm.datasourceId
          }
        }
        // 组装
        dsQueryApi.getTables(obj).then(response => {
          this.wTbList = response
        })
      }
    },
    getSchema() {
      const obj = {
        datasourceId: this.writerForm.datasourceId
      }
      dsQueryApi.getTableSchema(obj).then(response => {
        this.schemaList = response
      })
    },
    // schema 切换
    schemaChange(e) {
      this.writerForm.tableSchema = e
      // 获取可用表
      this.getTables('rdbmsWriter')
    },
    wDsChange(e) {
      // 清空
      this.writerForm.tableName = ''
      this.writerForm.datasourceId = e
      this.wDsList.find((item) => {
        if (item.id === e) {
          this.dataSource = item.datasource
        }
      })
      Bus.dataSourceId = e
      this.$emit('selectDataSource', this.dataSource)
    },
    // 获取表字段
    getColumns() {
      const obj = {
        datasourceId: this.writerForm.datasourceId,
        tableName: this.writerForm.tableName
      }
      dsQueryApi.getColumns(obj).then(response => {
        this.fromColumnList = response
        this.writerForm.columns = response
        this.writerForm.checkAll = true
        this.writerForm.isIndeterminate = false
      })
    },
    // 表切换
    wTbChange(t) {
      this.writerForm.tableName = t
      this.fromColumnList = []
      this.writerForm.columns = []
      this.getColumns('writer')
    },
    wHandleCheckAllChange(val) {
      this.writerForm.columns = val ? this.fromColumnList : []
      this.writerForm.isIndeterminate = false
    },
    wHandleCheckedChange(value) {
      const checkedCount = value.length
      this.writerForm.checkAll = checkedCount === this.fromColumnList.length
      this.writerForm.isIndeterminate = checkedCount > 0 && checkedCount < this.fromColumnList.length
    },
    getData() {
      if (Bus.dataSourceId) {
        this.writerForm.datasourceId = Bus.dataSourceId
      }
      return this.writerForm
    },
    getReaderData() {
      return this.$parent.getReaderData()
    },
    getTableName() {
      return this.fromTableName
    },
    createTable() {
      const obj = {
        // datasourceId: this.writerForm.datasourceId,
        // tableName: this.createTableName
        ...this.newCreateForm
      }
      dsQueryApi.createTable(obj).then(response => {
        this.$notify({
          title: 'Success',
          message: 'Create Table Successfully',
          type: 'success',
          duration: 2000
        })
        this.isNewTable = false
        this.getTables('rdbmsWriter')
      }).catch(() => console.log('promise catch err'))
    }
  }
}
</script>
