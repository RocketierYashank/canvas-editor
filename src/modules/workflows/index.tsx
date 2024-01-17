import { Box, Button, Group } from '@mantine/core';
import { useForm } from '@mantine/form';
import { generateId } from '../../utils';
import WorkflowEngine from './engine';
import TriggerNode from './nodes/TriggerNode';
import { Conditional, IActionNode, INode, ITriggerNode, IWorkflow, Target, When } from './types';
import ActionNode from './nodes/ActionNode';
import { useEffect } from 'react';
import { IconBolt, IconPlayerPlay } from '@tabler/icons-react';

interface WorkflowComponentProps {
	canvas: fabric.Canvas | null;
	currentSelectedElements: fabric.Object[] | null;
}

// React Component
const WorkflowComponent: React.FC<WorkflowComponentProps> = ({ canvas, currentSelectedElements }) => {
	const workflow = useForm<IWorkflow | null>({
		initialValues: {
			nodes: [],
		},
	});

	const handleButtonClick = async () => {
		try {
			if (!workflow) {
				return;
			}

			const workflowEngine = new WorkflowEngine(workflow.values as IWorkflow, currentSelectedElements, canvas);
			await workflowEngine.execute();
			// Optionally, handle something after workflow execution
		} catch (error) {
			console.error('Error executing workflow:', error);
			// Optionally, handle error UI feedback
		}
	};

	const createNewTrigger = () => {
		const newTrigger: ITriggerNode = {
			id: generateId(),
			type: 'trigger',
			label: 'Trigger',
			condition: {
				when: When.SELECTED_ELEMENT,
				conditional: Conditional.IS,
				target: Target.IMAGE,
			},
			next: [],
		};

		const newNodes = workflow.values?.nodes.concat(newTrigger);
		workflow.setFieldValue('nodes', newNodes);
	};

	const createNewAction = () => {
		const newAction: IActionNode = {
			id: generateId(),
			type: 'action',
			label: 'Action',
			execute: () => {},
			next: [],
		};

		// Set the id of the action node as 'next' of the last node
		const lastTriggerNode = workflow.values?.nodes[workflow.values?.nodes.length - 1] as INode;
		const newTriggerNode = { ...lastTriggerNode, next: [newAction.id] };
		const newNodes = workflow.values?.nodes.map(node => (node.id === lastTriggerNode.id ? newTriggerNode : node));

		// Add the new action node
		newNodes?.push(newAction);
		workflow.setFieldValue('nodes', newNodes);
	};

	useEffect(() => {
		console.log('workflow.values?.nodes', workflow.values?.nodes);
	}, [workflow.values?.nodes]);

	return (
		<Box>
			<Button onClick={handleButtonClick}>Execute</Button>
			<Group my="lg">
				<Button
					onClick={createNewTrigger}
					size="xs"
					leftIcon={<IconBolt size={12} />}
					variant="light"
					disabled={workflow.values?.nodes.find(node => node.type === 'trigger') !== undefined}
				>
					Trigger
				</Button>
				<Button
					onClick={createNewAction}
					size="xs"
					leftIcon={<IconPlayerPlay size={12} />}
					variant="light"
					disabled={workflow.values?.nodes.find(node => node.type === 'trigger') === undefined}
				>
					Action
				</Button>
			</Group>
			{workflow?.values?.nodes.map(node => {
				switch (node.type) {
					case 'trigger':
						return <TriggerNode key={node.id} id={node.id} workflow={workflow} />;
					case 'action':
						return <ActionNode key={node.id} id={node.id} workflow={workflow} />;
				}
			})}
		</Box>
	);
};

export default WorkflowComponent;